# Network Configuration Processing System

An automated full-stack application designed to parse, identify, and categorize networking configuration files (such as Cisco switches, routers, and firewalls) using React (Frontend), FastAPI (Backend), and MongoDB (Database).

---

## 1. Project Architecture & Technology Selection

### Architectural Diagram
```text
┌────────────────────────────────────────────────────────────────────────┐
│                          1. REACT FRONTEND                             │
│                                                                        │
│   [File/Folder Upload] ──(fetch API: Formdata)──┐                      │
│   [Dashboard Analytics]                         │                      │
│   [Live status Polling] <──(fetch API: JSON)───┐│                      │
└────────────────────────────────────────────────││──────────────────────┘
                                                 ││
                                                 ▼▼ (Port 8000)
┌────────────────────────────────────────────────────────────────────────┐
│                          2. FASTAPI BACKEND                            │
│                                                                        │
│   ┌─────────────────────┐       (write)       ┌──────────────────────┐ │
│   │ POST /api/upload    │ ──────────────────> │ Local uploads/ folder│ │
│   └─────────────────────┘                     └──────────────────────┘ │
│              │                                                         │
│        (insert job)                                                    │
│              │                                                         │
│              ▼                                                         │
│   ┌─────────────────────┐    (spawns)         ┌──────────────────────┐ │
│   │ MongoDB Collections │ <────────────────── │  Background Parser   │ │
│   │ - uploads           │                     │  - Reads files       │ │
│   │ - devices           │ <────────────────── │  - Matches hostname  │ │
│   └─────────────────────┘    (inserts docs)   │  - Matches component │ │
│                                               └──────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                   ▲
                                   │ (asynchronous connection)
┌────────────────────────────────────────────────────────────────────────┐
│                          3. MONGODB DATABASE                           │
│                                                                        │
│   Stores metadata (uploads job list) and parsed device output.         │
└────────────────────────────────────────────────────────────────────────┘
```

### Technology Selection Rationale
1. **FastAPI (Python)**:
   - *Why*: FastAPI is a high-performance framework built on standard Python type hints. It natively supports asynchronous endpoints and incorporates validation out-of-the-box via Pydantic. It provides `BackgroundTasks` which makes it ideal for triggering resource-heavy file parsers without blocking incoming API calls.
2. **React (JavaScript) via Vite**:
   - *Why*: Vite offers an extremely fast build toolchain. React allows us to build state-driven components that dynamically update. In network operations (NetOps), operators need real-time dashboards that show exactly when parsed jobs finish without manual page refreshes.
3. **Fetch API (No Axios)**:
   - *Why*: The standard browser `fetch` API is now incredibly powerful and eliminates the need for external package overhead like Axios, simplifying client-side dependencies.
4. **MongoDB + Motor**:
   - *Why*: Network configurations are semi-structured text files. Their schemas can evolve (e.g., adding interfaces list, serial numbers, IP routing tables). MongoDB's document-based nature is perfect for storing variable device schemas. `Motor` is the official asynchronous driver for MongoDB, enabling non-blocking database queries inside FastAPI's async/await loop.

---

## 2. File & Data Flow Lifecycle

How files and data move through the system:
1. **User Action**: The user selects multiple `.cfg` configuration files or drops an entire directory in the React frontend.
2. **Form Construction**: The files are packed into a `FormData` object along with a label (e.g. `cisco_configs`).
3. **API Upload Call**: React sends a `POST` request with the multipart data to `/api/upload` on port `8000`.
4. **FastAPI Job Creation**:
   - The backend creates an upload metadata document in MongoDB (`status: "pending"`).
   - A subfolder named after the job's unique MongoDB `_id` is created inside the server's `uploads/` directory to prevent file name collisions.
   - FastAPI saves the raw files to this folder.
5. **Background Task Delegation**: FastAPI returns the job ID and `pending` status back to the frontend immediately, freeing up the HTTP connection. Simultaneously, it fires an async worker using FastAPI `BackgroundTasks`.
6. **Asynchronous Processing**:
   - The background worker reads files sequentially.
   - For each file, it searches for hostnames using regex and matches command keywords to find the device type.
   - It inserts a document for each parsed device into the MongoDB `devices` collection.
   - The background worker updates the parent job status in MongoDB to `success` or `failed`.
7. **Polling Updates**: Meanwhile, the React client polls `/api/jobs`, `/api/devices`, and `/api/stats` every 2 seconds, reflecting live status changes dynamically.

---

## 3. Directory Structure

```text
Networking_Upload/
├── README.md                      # Documentation (this file)
├── backend/
│   ├── main.py                    # FastAPI routes, CORS configuration, API endpoints
│   ├── database.py                # Asynchronous MongoDB client setup via Motor
│   ├── parser.py                  # Background parsing task & pattern matching logic
│   ├── models.py                  # Pydantic validation schemas
│   ├── requirements.txt           # Python dependency file
│   ├── uploads/                   # Local storage directory for uploaded configs
│   └── test_configs/              # Mock config files for local testing
└── frontend/
    ├── package.json               # Node dependencies and scripts
    ├── index.html                 # Main entry template
    ├── vite.config.js             # Vite configuration
    └── src/
        ├── main.jsx               # React bootstrapping
        ├── App.jsx                # Main frontend component (fetch API, upload handlers, polling)
        └── index.css              # Custom styling tokens (glassmorphism & dark-theme)
```

---

## 4. Key Implementation Details

### MongoDB Schema Design

#### 1. `uploads` Collection
Tracks jobs submitted by users.
```json
{
  "_id": "ObjectId",
  "folder_name": "configs_v1",
  "status": "success",         // "pending" -> "processing" -> "success" or "failed"
  "files_count": 5,
  "error_message": null,       // Tracks errors if job failed
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

#### 2. `devices` Collection
Stores metadata for parsed devices, linked back to the upload job.
```json
{
  "_id": "ObjectId",
  "upload_id": "6a142c6d5d92943be49c970e",
  "device_name": "SW-CORE-01",
  "device_type": "Switch",     // "Switch", "Router", "Firewall", "Unknown"
  "configuration": "! Cisco Switch Config Example...",
  "status": "success",
  "file_path": "backend/uploads/6a142c6d5d92943be49c970e/switch1.cfg",
  "error_message": null,
  "parsed_at": "ISODate"
}
```

---

### Backend Logic Explained

#### Database Async Integration (`backend/database.py`)
```python
# Async client setup
client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client["network_config_db"]
```
*Explanation*: Running standard PyMongo blocks FastAPI's event loop since PyMongo operates synchronously. Using `AsyncIOMotorClient` allows python to yield control during database operations (`await db.command("ping")`), enabling the single-threaded event loop to handle other requests.

#### Pattern Matching & Parser (`backend/parser.py`)
```python
HOSTNAME_REGEX = re.compile(r"^\s*hostname\s+([a-zA-Z0-9-_]+)", re.IGNORECASE | re.MULTILINE)
```
*Why Regex is Better*: A simple substring search like `if "hostname" in line` can fail if:
1. "hostname" is commented out (e.g. `! hostname SW1`).
2. There are multiple spaces (e.g. `hostname   SW1`).
3. There are leading spaces.
Using the regular expression `r"^\s*hostname\s+([a-zA-Z0-9-_]+)"` with `re.MULTILINE` ensures we match lines starting with optionally spaced `hostname`, followed by at least one space, and capture the exact alphanumeric hostname, disregarding case.

```python
# Device Classification Logic
content_lower = content.lower()
if "switchport" in content_lower:
    device_type = "Switch"
elif "router ospf" in content_lower:
    device_type = "Router"
elif "firewall" in content_lower:
    device_type = "Firewall"
else:
    device_type = "Unknown"
```
*Explanation*: We perform string audits on the configuration body. Cisco switches configure VLAN interfaces with the `switchport` keyword. Cisco routers running OSPF use `router ospf` configuration blocks. ASA Firewalls or security appliances contain the word `firewall`. Fallback is tagged as `Unknown`.

#### Background Workers (`backend/main.py`)
```python
background_tasks.add_task(process_upload_job, job_id, job_folder)
```
*Explanation*: The HTTP upload request ends immediately when it returns `202 ACCEPTED`. FastAPI's `BackgroundTasks` executes the `process_upload_job` function inside the background worker pool, preventing timeouts on large configuration files.

---

### Frontend Logic & Communication

#### Using Fetch to Upload Files
```javascript
const formData = new FormData();
formData.append('folder_name', folderName);
selectedFiles.forEach((file) => {
  formData.append('files', file, file.webkitRelativePath || file.name);
});

const response = await fetch('http://localhost:8000/api/upload', {
  method: 'POST',
  body: formData, // Browser sets multipart/form-data and boundary automatically
});
```
*Explanation*: `FormData` formats inputs into a multipart representation matching boundary specs, which FastAPI processes via its `UploadFile` class.

#### Intelligent Polling
```javascript
useEffect(() => {
  fetchData();
  const getPollInterval = () => {
    const hasActive = jobs.some(j => j.status === 'pending' || j.status === 'processing');
    return hasActive ? 2000 : 5000;
  };
  let intervalId = setInterval(fetchData, getPollInterval());
  return () => clearInterval(intervalId);
}, [jobs.map(j => j.status).join(',')]);
```
*Explanation*: Polling dynamically speeds up (every 2 seconds) when the frontend detects any active parsing job. Once jobs settle into `success` or `failed` status, the polling slows down to 5 seconds to reduce network requests.

---

## 5. Step-by-Step Local Setup

Ensure MongoDB is installed and running on your local machine (`localhost:27017`).

### 1. Backend Setup
```bash
# Navigate to backend
cd backend

# Create Virtual Environment
python3 -m venv venv

# Activate Virtual Environment
source venv/bin/activate  # On Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Start FastAPI Server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup
Open a new terminal window:
```bash
# Navigate to frontend
cd frontend

# Install Node dependencies
npm install

# Start Vite React server
npm run dev -- --host 0.0.0.0
```

---

## 6. Testing Instructions

### Automated/API Testing using CLI
Verify the system by uploading the sample mock configs inside `backend/test_configs/`:
```bash
curl -X POST -F "folder_name=my_configs" \
  -F "files=@backend/test_configs/switch1.cfg" \
  -F "files=@backend/test_configs/router1.cfg" \
  -F "files=@backend/test_configs/firewall1.cfg" \
  -F "files=@backend/test_configs/unknown1.cfg" \
  -F "files=@backend/test_configs/no_hostname.cfg" \
  http://localhost:8000/api/upload
```
Check jobs:
```bash
curl http://localhost:8000/api/jobs
```
Check devices parsed:
```bash
curl http://localhost:8000/api/devices
```

---

## 7. Common Errors & Troubleshooting

1. **MongoDB Connection Fails (`database: disconnected`)**:
   - *Cause*: MongoDB service is not running or port is blocked.
   - *Fix*: Start MongoDB using `sudo systemctl start mongod` or `sudo service mongod start`.
2. **CORS Policy Blocked**:
   - *Cause*: Frontend running on port 5173 is unable to query port 8000 because CORS middleware is missing.
   - *Fix*: Check `backend/main.py`. The `CORSMiddleware` has been added allowing `allow_origins=["*"]`. Adjust this to match your domain in production.
3. **Upload File Limit / Timeout**:
   - *Cause*: Standard HTTP requests have a default timeout of 60 seconds. Large bulk folders might exceed limits.
   - *Fix*: This system uses `BackgroundTasks`, so files are written to disk and processed asynchronously, bypassing timeouts. For large file sizes, adjust ASGI body limits.

---

## 8. Enterprise Production Recommendations

1. **Robust Worker Processors (Celery + Redis)**:
   - FastAPI's `BackgroundTasks` runs on the same process. For high-volume parsing, offload execution to a separate worker pool like **Celery** or **Arq** backed by a **Redis** message queue. This prevents heavy CPU loads from impacting API request times.
2. **Database Indices**:
   - Add indices on fields frequently queried or filtered:
     - `db.devices.createIndex({ upload_id: 1 })`
     - `db.devices.createIndex({ device_name: "text" })` for search optimization.
3. **WebSocket Connections**:
   - Instead of polling periodically, replace HTTP polling with **WebSockets** or **Server-Sent Events (SSE)**. The backend can publish updates directly to the connected client the instant database updates are written.
4. **Enhanced Parsing engine**:
   - Introduce **Netmiko**, **NAPALM**, or structured parsing libraries like **CiscoConfParse** or **TTP** to parse complex settings (IP routes, ACLs, firmware versions).
