# Network Audit & Compliance Platform

Enterprise-grade network configuration audit, compliance validation, and golden template management platform.

## Architecture

```
Upload Folder → Detect Device Type → Load Golden Template → Extract Controls
    → Compare Controls → Generate Report → Store in MongoDB → Dashboard
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, Python 3.12, Motor, Pydantic, Jinja2 |
| Frontend | React, Tailwind CSS, React Query, React Router, Recharts |
| Database | MongoDB |
| Reports | ReportLab (PDF), OpenPyXL (Excel) |

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- Docker (for MongoDB)

### Run

```bash
chmod +x start.sh
./start.sh
```

Or manually:

```bash
# Start MongoDB
docker compose up -d mongodb

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m app.database.seed_templates
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

- **Frontend:** http://localhost:5173
- **API Docs:** http://localhost:8000/docs
- **Health:** http://localhost:8000/health

### Test with Sample Configs

Upload files from `sample_configs/`:
- `switch1.cfg`, `switch2.cfg`, `switch3.cfg`
- `router1.cfg`, `router2.cfg`
- `wlc1.cfg`, `wlc2.cfg`

## MongoDB Collections

### golden_templates

```json
{
  "vendor": "Cisco",
  "device_type": "switch",
  "template_name": "Cisco3650Standard",
  "template_type": "jinja2",
  "template_content": "...",
  "sections": { "aaa": [], "security": [], "snmp": [] },
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### device_configs

```json
{
  "device_name": "switch1",
  "device_type": "switch",
  "vendor": "Cisco",
  "file_path": "/path/to/switch1.cfg",
  "config_content": "...",
  "upload_batch_id": "uuid",
  "detected_at": "ISO8601"
}
```

### audit_results

```json
{
  "device_name": "switch1",
  "device_type": "switch",
  "audit_mode": "full",
  "overall_score": 92.0,
  "category_scores": { "aaa": 100, "security": 95 },
  "passed": [],
  "failed": [],
  "config_id": "...",
  "template_id": "...",
  "created_at": "ISO8601"
}
```

### audit_reports

```json
{
  "device_name": "switch1",
  "overall_score": 92,
  "category_scores": {},
  "passed": [],
  "failed": [],
  "recommendations": [],
  "audit_result_id": "...",
  "created_at": "ISO8601"
}
```

### recommendations

```json
{
  "report_id": "...",
  "rule": "service password-encryption",
  "status": "FAIL",
  "recommendation": "Enable password encryption",
  "remediation": "service password-encryption",
  "created_at": "ISO8601"
}
```

### compliance_trends

```json
{
  "date": "2026-06-11",
  "overall_score": 88.5,
  "device_count": 7
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/audit/upload` | Upload config files |
| POST | `/api/audit/run/{config_id}` | Run compliance audit |
| POST | `/api/audit/run-batch` | Batch audit |
| GET | `/api/audit/reports` | List reports |
| GET | `/api/audit/reports/{id}` | Get report |
| GET | `/api/audit/reports/{id}/export/pdf` | Export PDF |
| GET | `/api/audit/reports/{id}/export/excel` | Export Excel |
| GET | `/api/audit/dashboard` | Dashboard stats |
| GET | `/api/audit/devices` | Device inventory |
| GET | `/api/templates` | List golden templates |
| POST | `/api/templates` | Create template |
| PUT | `/api/templates/{id}` | Update template |
| DELETE | `/api/templates/{id}` | Delete template |
| POST | `/api/detect` | Detect device type |

## Compliance Engine

The audit engine does **not** perform line-by-line comparison. Instead:

1. Parse golden template → extract controls by category
2. Parse device config → extract controls
3. Normalize dynamic values (hostname, IPs, VLAN IDs, SSIDs) → ignored during comparison
4. Compare controls → PASS/FAIL per rule
5. Calculate scores: `(pass_count / total_rules) * 100`

### Dynamic Variables (Ignored)

- hostname, IP addresses, management IP
- interface descriptions, DNS/NTP server IPs
- SNMP community/user, VLAN IDs, SSID names, port numbers

## Extensibility

Add new vendors/device types without code changes:

1. Create a golden template in MongoDB (via UI or API)
2. Add detection patterns to `device_detector.py` (optional — can use vendor field from config)
3. Templates use Jinja2 placeholders for dynamic values

Supported out of the box: Cisco Switch, Router, WLC 9800, Nexus, Firewall patterns.

Future vendors: Juniper, Arista, Palo Alto, Fortinet (detection patterns included).

## Project Structure

```
backend/
  app/
    api/           # FastAPI routes
    database/      # MongoDB connection & seed
    schemas/       # Pydantic models
    services/      # Business logic
    templates/     # Jinja2 golden templates
    reports/       # PDF & Excel generators
    utils/         # Dynamic variable normalization
frontend/
  src/
    pages/         # React pages
    components/    # UI components
    api/           # Axios client
sample_configs/    # Test configuration files
```

## License

MIT
