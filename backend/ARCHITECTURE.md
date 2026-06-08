# Architecture Diagram: New Enhanced System

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                     NETWORK AUDITING APPLICATION                            ║
║                         Enhanced Architecture                               ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────────────────┐
│                              INPUT LAYER                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Upload Folder                    Golden Templates                           │
│  ┌──────────────┐                 ┌──────────────────────┐                   │
│  │ Device1.conf │                 │ switch_template.txt  │                   │
│  │ Device2.conf │                 │ router_template.txt  │                   │
│  │ Device3.conf │                 │ firewall_template.txt│                   │
│  └──────────────┘                 │ wlc_template.txt     │                   │
│         │                         └──────────────────────┘                   │
│         └────────────────────────────────────────────────────────────────────┘
│              │                              │
└──────────────┼──────────────────────────────┼──────────────────────────────────
               │                              │
               ▼                              │
┌──────────────────────────────────────────────────────────────────────────────┐
│                         EXTRACTION LAYER (20s)                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│          ExtractionWorker.process_upload()                                  │
│          (existing - unchanged)                                             │
│                                                                              │
│          • Extract files from folder                                        │
│          • Create device records (status='pending')                         │
│          • Store file_path for each device                                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────
               │
               ▼
        MongoDB: uploads collection
        status='staged'
               │
               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         PARSING LAYER (30s)                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│          ParserWorker.process_upload_job()                                  │
│          (modified - NEW separation of concerns)                            │
│                                                                              │
│          FOR each device (status='pending'):                               │
│          ┌─────────────────────────────────────┐                           │
│          │ 1. Read raw config file             │                           │
│          │ 2. Call ParserService.parse_device()│                           │
│          │    ↓                                 │                           │
│          │ 3. ParserFactory.get_parser()       │                           │
│          │    ↓                                 │                           │
│          │ 4. CiscoParser.parse()              │                           │
│          │    (modified - no audit)            │                           │
│          │    ↓                                 │                           │
│          │ 5. GenericConfigParser.parse_config()  NEW                      │
│          │    • Detect indentation             │                           │
│          │    • Build hierarchical structure   │                           │
│          │    • Return JSON                    │                           │
│          │    ↓                                 │                           │
│          │ 6. Store in device:                 │                           │
│          │    • configuration_json             │                           │
│          │    • status='parsed'                │                           │
│          │    • parsed_data (existing)         │                           │
│          └─────────────────────────────────────┘                           │
│                                                                              │
│          • Update upload counters:                                         │
│            - parsed_success_count++                                        │
│            - parsed_failed_count++ (on error)                              │
│            - total_devices = count                                         │
│                                                                              │
│          • Upload status: 'staged' → 'parsed'                             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────
               │
               ▼
        MongoDB: devices collection
        status='parsed'
        configuration_json populated
               │
               ▼
        MongoDB: uploads collection
        status='parsed'
        counters updated
               │
               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         AUDIT LAYER (40s) - NEW                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│          AuditWorker.process_audit_job()       NEW                          │
│                                                                              │
│          FOR each device (status='parsed'):                               │
│          ┌─────────────────────────────────────┐                           │
│          │ 1. Load device.configuration_json   │                           │
│          │ 2. Call AuditService.audit_device() │  NEW                      │
│          │    ↓                                 │                           │
│          │ 3. AuditService._load_template()    │  NEW                      │
│          │    • Get device_type                │                           │
│          │    • Read template file             │                           │
│          │    ↓                                 │                           │
│          │ 4. TemplateParser.parse_template()  │  NEW                      │
│          │    • Parse with placeholders        │                           │
│          │    • Return JSON with {{...}}       │                           │
│          │    ↓                                 │                           │
│          │ 5. ComparisonEngine.compare()       │  NEW                      │
│          │    • Recursive JSON tree compare    │                           │
│          │    • Match {{PLACEHOLDER}}          │                           │
│          │    • Categorize findings            │                           │
│          │    • Calculate score                │                           │
│          │    ↓                                 │                           │
│          │ 6. Store in device:                 │                           │
│          │    • audit_result (full output)     │                           │
│          │    • audit_status (SUCCESS/FAILED)  │                           │
│          │    • audit_score, audit_summary     │                           │
│          │    • findings array                 │                           │
│          │    • status='success'               │                           │
│          └─────────────────────────────────────┘                           │
│                                                                              │
│          • Update upload counters:                                         │
│            - audit_success_count++                                         │
│            - audit_failed_count++ (on error)                               │
│                                                                              │
│          • Upload status: 'parsed' → 'success'                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────
               │
               ▼
        MongoDB: devices collection
        status='success'
        audit_result populated
               │
               ▼
        MongoDB: uploads collection
        status='success'
        all counters finalized
               │
               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         OUTPUT LAYER                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  GET /api/v1/uploads/{id}                                                  │
│  {                                                                          │
│    "total_devices": 3,                                                     │
│    "parsed_success_count": 3,                                              │
│    "parsed_failed_count": 0,                                               │
│    "audit_success_count": 3,                                               │
│    "audit_failed_count": 0,                                                │
│    "status": "success"                                                     │
│  }                                                                          │
│                                                                              │
│  GET /api/v1/devices/{id}                                                  │
│  {                                                                          │
│    "device_name": "SW1",                                                   │
│    "configuration_json": {                                                 │
│      "hostname": "SW1",                                                    │
│      "ip": {"ssh": {"version": "2"}},                                      │
│      ...                                                                   │
│    },                                                                       │
│    "audit_result": {                                                       │
│      "score": 92.5,                                                        │
│      "summary": {                                                          │
│        "compliant": 20,                                                    │
│        "missing": 3,                                                       │
│        "non_compliant": 2,                                                 │
│        "extra": 5                                                          │
│      },                                                                     │
│      "findings": [...]                                                     │
│    },                                                                       │
│    "status": "success"                                                     │
│  }                                                                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────

                              SCHEDULER JOBS
                            ┌─────────────┐
                            │  APScheduler│
                            └────────┬────┘
           ┌────────────────────────┼────────────────────────┐
           │                        │                        │
           ▼                        ▼                        ▼
    ┌─────────────┐        ┌──────────────┐       ┌─────────────────┐
    │ Every 20s   │        │  Every 30s   │       │   Every 40s     │
    │ Extraction  │        │   Parsing    │       │  Audit (NEW)    │
    │   Job       │        │    Job       │       │     Job         │
    └─────────────┘        └──────────────┘       └─────────────────┘
    process_uploaded_jobs  process_pending_      process_pending_
                           uploads               audits (NEW)

                         COMPONENT RELATIONSHIPS

    ConfigParser (generic)      TemplateParser (generic)
    ↑                           ↑
    │                           │
    CiscoParser                 AuditService
    ↑                           ↑
    │                           │
    ParserService              ComparisonEngine
    ↑                           ↑
    │                           │
    ParserWorker                AuditWorker
    ↑                           ↑
    │                           │
    processing_tasks ──────────→ processing_tasks
    ↑                           ↑
    │                           │
    scheduler ──────────────────→ scheduler (NEW)
    (20s, 30s, 40s)

                         DATABASE COLLECTIONS

    ┌─────────────┐              ┌─────────────┐
    │   uploads   │              │   devices   │
    ├─────────────┤              ├─────────────┤
    │ _id         │              │ _id         │
    │ folder_name │              │ upload_id   │
    │ status      │              │ device_name │
    │ files_count │              │ device_type │
    │ ...         │              │ config      │
    │             │              │             │
    │ NEW:        │              │ NEW:        │
    │ total       │              │ config_json │
    │ devices     │              │ audit_      │
    │ parsed_     │              │ result      │
    │ success_    │              │             │
    │ count       │              │ status: 4   │
    │ parsed_     │              │ states      │
    │ failed_     │              │             │
    │ count       │              │ (pending,   │
    │ audit_      │              │  parsed,    │
    │ success_    │              │  success,   │
    │ count       │              │  failed)    │
    │ audit_      │              │             │
    │ failed_     │              │             │
    │ count       │              │             │
    └─────────────┘              └─────────────┘

                         FILES ORGANIZATION

    app/
    ├── parsers/
    │   ├── cisco_parser.py (modified)
    │   └── common/
    │       ├── generic_config_parser.py (NEW)
    │       └── template_parser.py (NEW)
    ├── services/
    │   ├── audit_service.py (NEW)
    │   └── comparison_engine.py (NEW)
    └── workers/
        ├── parser_worker.py (modified)
        ├── audit_worker.py (NEW)
        ├── scheduler.py (modified)
        └── processing_tasks.py (modified)

```

---

## Data Flow Examples

### Example 1: Single Device Configuration

```
INPUT: switch_config.txt
└─ hostname SW1
   ip ssh version 2
   interface Gig1/0/1
     switchport mode access
     switchport access vlan 10

PARSING:
└─ GenericConfigParser.parse_config()
   └─ Output: {
        "hostname": "SW1",
        "ip": {"ssh": {"version": "2"}},
        "interface": {
          "Gig1/0/1": {
            "switchport": {
              "mode": "access",
              "access": {"vlan": "10"}
            }
          }
        }
      }

TEMPLATE:
└─ switch_golden_template.txt
   └─ hostname {{HOSTNAME}}
      ip ssh version 2
      interface {{INTERFACE}}
        switchport mode access
        ...

TEMPLATE_PARSED:
└─ TemplateParser.parse_template()
   └─ Output: {
        "hostname": "{{HOSTNAME}}",
        "ip": {"ssh": {"version": "2"}},
        "interface": {...}
      }

COMPARISON:
└─ ComparisonEngine.compare(device_json, template_json)
   └─ Output: {
        "score": 92.5,
        "summary": {
          "compliant": 20,
          "missing": 3,
          "non_compliant": 0,
          "extra": 2
        },
        "findings": [
          {
            "path": "hostname",
            "status": "COMPLIANT",
            "expected": "{{HOSTNAME}}",
            "actual": "SW1"
          },
          {
            "path": "ntp.server",
            "status": "MISSING",
            "expected": "{{NTP_SERVER}}",
            "actual": null
          },
          ...
        ]
      }

STORAGE:
└─ Device document updated:
   {
     "configuration_json": {...},
     "audit_result": {...},
     "status": "success"
   }
   Upload counters updated:
   {
     "audit_success_count": 1,
     "total_devices": 1
   }
```

---

## Status Progression Timeline

```
TIME    UPLOAD              DEVICES             ACTION
────────────────────────────────────────────────────────────────
 0s     uploaded            pending             File upload
 5s     →staged             pending             Extraction complete
20s     processing          pending             Parser job starts
        (unchanged)         (unchanged)         
25s     processing          →parsed             Parser job ends
        →parsed                                 
30s     parsed              parsed              Audit job starts
        (unchanged)         (unchanged)         
35s     parsed              →success/failed     Audit job ends
        →success                                
40s     success             success             Next cycle begins
```

---

## Backward Compatibility

```
OLD DEVICES (before enhancement):
{
  "status": "success",
  "audit_status": "SUCCESS",
  "audit_score": 92.5,
  "audit_summary": {...},
  "findings": [...]
}
↓
STILL WORKS: All old fields accessible via APIs

NEW DEVICES (after enhancement):
{
  "status": "success",
  "configuration_json": {...},
  "audit_result": {
    "score": 92.5,
    "summary": {...},
    "findings": [...]
  },
  
  // Old fields also populated for compatibility
  "audit_status": "SUCCESS",
  "audit_score": 92.5,
  "audit_summary": {...},
  "findings": [...]
}
↓
FULLY COMPATIBLE: Both old and new APIs work
```

---

## Summary

✅ **Clean Separation of Concerns**: Parse → Audit → Result  
✅ **Scalable Hierarchical Parsing**: Works with any config format  
✅ **Semantic Comparison**: JSON trees instead of regex lines  
✅ **Observable**: Upload and device-level metrics  
✅ **Extensible**: Ready for dynamic templates, multi-vendor, reports  
✅ **Compatible**: Zero breaking changes, new fields optional

