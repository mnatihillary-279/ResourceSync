ResourceSync

An Offline-First Resource Tracking System

ResourceSync is a web-based resource tracking application developed for the Zetech Forge Alumni × Student Hackathon 2026 — Software Development Challenge B: Offline-First Resource Tracker.

It enables users to manage resource inventory when internet connectivity is unavailable. Changes are stored locally in the browser and submitted to a central MongoDB database when connectivity is restored.

ResourceSync also includes a Resource Rescue Engine that identifies potential transfers of surplus resources to locations experiencing shortages.

1. Project Objectives

ResourceSync aims to:

- Support resource creation, viewing, updating and deletion.
- Preserve local changes during network interruptions.
- Synchronize pending operations when connectivity returns.
- Process queued operations in FIFO order.
- Prevent duplicate operation processing through operation identifiers.
- Detect conflicting updates and apply deterministic conflict resolution.
- Provide visibility into resource availability and low-stock levels.
- Identify potential resource redistribution opportunities.

2. Key Features

Resource Management

- Create and manage resource records.
- Search and view inventory.
- Track quantities, minimum stock levels, categories and locations.
- Identify resources with low stock.

Offline-First Functionality

- Store resource records in IndexedDB.
- Maintain a durable local synchronization queue.
- Preserve pending operations across browser refreshes.
- Synchronize queued changes when connectivity returns.
- Cache the application shell using a Service Worker.

Synchronization and Conflict Management

- Process pending operations in FIFO order.
- Assign unique operation IDs.
- Use server-side operation receipts to prevent duplicate processing.
- Detect version conflicts.
- Apply deterministic last-write-wins conflict resolution using timestamps and device IDs.
- Store conflict information for inspection.

Resource Rescue Engine

The Resource Rescue Engine analyses matching resources across locations to identify potential redistribution opportunities.

It:

- Identifies surplus resources at source locations.
- Identifies shortages at destination locations.
- Calculates suggested transfer quantities.
- Avoids recommending transfers that exceed available surplus or destination shortages.
- Provides explanations for recommendations.

Recommendations are advisory. They do not physically transfer inventory or automatically execute stock movements.

Demand Flow

Demand Flow presents consumption activity grouped by resource and location.

It distinguishes illustrative demonstration figures from consumption events recorded locally on the current device.

Actual locally recorded consumption updates inventory and creates a synchronization operation. The associated consumption history is currently device-local and is not independently synchronized to the central database.

3. Technology Stack

Component| Technology
Frontend| React
Build tool| Vite
Backend| Node.js
API framework| Express.js
Database| MongoDB
Browser database| IndexedDB
Offline application shell| Service Worker
Input validation| Zod
HTTP security headers| Helmet
Icons| Lucide React
Automated testing| Node.js built-in test runner

4. System Architecture

ResourceSync consists of three main layers.

Frontend

The React application provides the user interface, manages resource operations and communicates with browser storage and the backend API.

Local storage

IndexedDB maintains resource records, pending synchronization operations, processed operation identifiers and local resource movement records.

Backend

The Express API validates synchronization requests, processes operations and stores shared resources, operation receipts and conflict records in MongoDB.

Synchronization workflow

User performs a resource operation
              |
              v
       Update IndexedDB
              |
              v
       Add to FIFO queue
              |
              v
       Check connectivity
          /       \
       Offline    Online
          |         |
          v         v
     Retain queue  Submit operation
                      |
                      v
               Validate request
                      |
                      v
               Check operation ID
                      |
                      v
               Detect conflicts
                      |
                      v
               Apply resolution
                      |
                      v
               MongoDB transaction
                      |
                      v
               Return acknowledgement
                      |
                      v
               Remove acknowledged item

5. Data Structures and Algorithms

The implementation incorporates the following data structures:

Data structure| Implementation| Purpose
FIFO Queue| IndexedDB "pendingOperations" store| Preserves operation processing order
Map| JavaScript "Map"| Efficient resource lookup by identifier
Set| JavaScript "Set"| Tracks processed operation identifiers
Operation receipt collection| MongoDB "operationReceipts"| Server-side duplicate-operation protection

FIFO synchronization queue

Pending operations are stored with an auto-incrementing sequence number. The synchronization service retrieves the oldest pending operation first.

An operation is removed from the queue only after successful acknowledgement.

Record Map

A JavaScript Map associates resource identifiers with their corresponding resource records.

Operation-ID Set

A JavaScript Set provides efficient membership checks for operation identifiers already processed locally.

Conflict resolution

The backend compares incoming changes with existing resource versions.

The conflict policy uses:

1. Client timestamps.
2. Device identifiers as deterministic tie-breakers.

The backend uses MongoDB transactions to maintain consistency between resource updates, conflict records and operation receipts.

6. Project Structure

ResourceSync/
├── client/
│   ├── src/
│   │   ├── services/
│   │   │   ├── database.js
│   │   │   ├── resourceRescue.js
│   │   │   ├── resourceService.js
│   │   │   └── syncService.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── test/
│   ├── index.html
│   └── package.json
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── app.js
│   │   └── server.js
│   ├── test/
│   └── package.json
├── docs/
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
├── REQUIREMENTS.txt
└── TESTING.md

7. Requirements

- Node.js 20 or later.
- npm 10 or later.
- MongoDB configured as a transaction-capable replica set or sharded deployment.
- Git.
- A modern browser supporting IndexedDB, Service Workers and the Fetch API.

A standalone MongoDB deployment does not support the multi-document transactions required by this implementation.

See "REQUIREMENTS.txt" for further details.

8. Installation and Local Development

Clone the repository

git clone https://github.com/mnatihillary-279/ResourceSync.git
cd ResourceSync

Install dependencies

npm install

Configure MongoDB

Start a MongoDB deployment configured to support transactions.

For local development, use a single-node replica set named "rs0".

Initialize it once:

rs.initiate()

Verify its status:

rs.status()

The replica-set member should become PRIMARY.

Configure environment variables

Create "server/.env" using ".env.example" as a reference.

Example local configuration:

MONGODB_URI=mongodb://127.0.0.1:27017/?replicaSet=rs0
MONGODB_DATABASE=resourcesync
PORT=4000
NODE_ENV=development

Use an authorized MongoDB connection string for your environment.

Never commit actual ".env" files, passwords or database credentials.

Start the application

From the project root:

npm run dev

Local development addresses:

Service| Address
Frontend| http://localhost:5173
Backend| http://localhost:4000
Health check| http://localhost:4000/healthz
Database readiness| http://localhost:4000/readyz

9. Available Commands

Run commands from the project root.

Command| Purpose
"npm install"| Install workspace dependencies
"npm run dev"| Start frontend and backend development servers
"npm run build"| Build the frontend for production
"npm start"| Start the production backend
"npm test"| Run the server automated test suite

10. API Endpoints

Method| Endpoint| Purpose
GET| "/healthz"| Check API process health
GET| "/readyz"| Check database readiness
GET| "/api/resources"| Retrieve resource records
GET| "/api/conflicts"| Retrieve recorded conflicts
POST| "/api/sync"| Submit a synchronization operation

11. Testing

Run the automated server tests:

npm test

Build the frontend:

npm run build

The project includes automated tests for conflict resolution and Resource Rescue Engine behaviour.

Additional manual and integration testing is required for:

- Offline resource creation and modification.
- Persistence after browser refresh.
- FIFO synchronization after reconnection.
- Failed synchronization and retry.
- Duplicate operation handling.
- Concurrent resource updates.
- MongoDB transaction failure and recovery.
- Multi-device synchronization.

A successful frontend build or passing unit tests do not independently prove that every offline synchronization scenario works.

See "TESTING.md" for the testing strategy and verification procedures.

12. Security and Limitations

ResourceSync is a hackathon development prototype.

Known limitations include:

- Authentication and role-based authorization are not implemented.
- The current conflict policy depends partly on client timestamps, which may be affected by device clock differences.
- Consumption movement history is currently stored locally rather than synchronized as a separate server-side record.
- End-to-end synchronization and production failure-recovery testing require further verification.
- Production deployment requires secure database configuration and appropriate access controls.

Do not use real patient information, confidential medical records or sensitive personal data.

See "SECURITY.md" for security considerations.

13. Team Collaboration

The project is maintained through Git and GitHub.

Repository:

https://github.com/mnatihillary-279/ResourceSync

Contributors should:

1. Pull the latest changes before starting work.
2. Create a separate feature branch.
3. Avoid editing another contributor's active files without coordination.
4. Commit focused changes with descriptive messages.
5. Push changes to GitHub.
6. Submit changes for review before merging into the main branch.
7. Run relevant tests before merging.

See "CONTRIBUTING.md" for the collaboration workflow.

14. Project Status

ResourceSync is a working development prototype with resource management, local persistence, synchronization logic, conflict handling, Resource Rescue recommendations and Demand Flow reporting.

Production deployment, security hardening and comprehensive end-to-end verification remain separate tasks.

---

ResourceSync — Reliable resource tracking, even without connectivity.
