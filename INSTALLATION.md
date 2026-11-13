ResourceSync Installation Guide

1. Overview

This guide explains how to install and run ResourceSync in a local development environment.

ResourceSync consists of:

- Frontend: React and Vite.
- Backend: Node.js and Express.
- Database: MongoDB with transaction support.
- Local persistence: Browser IndexedDB.
- Development tooling: npm workspaces.

The Express server serves the production frontend build and the backend API from the same origin.

2. Prerequisites

Install the following:

Requirement| Purpose
Node.js 20 or later| Runs the frontend tooling and backend
npm 10 or later| Installs dependencies and manages workspaces
MongoDB| Stores central resource and synchronization data
Git| Clones and manages the project repository
Modern browser| Runs the application and supports IndexedDB

MongoDB must support multi-document transactions. For a local installation, configure MongoDB as a replica set.

3. Obtain the project

Clone the repository:

git clone https://github.com/mnatihillary-279/ResourceSync.git
cd ResourceSync

If the repository has already been cloned, open its project directory instead.

4. Install dependencies

Run this command from the project root:

npm install

The root "package.json" defines the frontend and backend as npm workspaces.

5. Configure MongoDB

Start a MongoDB instance configured as a replica set.

For local development, the example configuration uses:

- Host: "127.0.0.1"
- Port: "27017"
- Replica set: "rs0"
- Database: "resourcesync"

The replica set must be initialized and available before starting the application.

Verify the connection using MongoDB Shell:

rs.status()

Confirm that the replica set has an available PRIMARY member.

6. Configure environment variables

The root directory contains ".env.example".

Copy it into the server workspace as ".env":

PowerShell:

Copy-Item .\.env.example .\server\.env

The example configuration is:

MONGODB_URI=mongodb://127.0.0.1:27017/?replicaSet=rs0
MONGODB_DATABASE=resourcesync
PORT=4000
NODE_ENV=development

Update the values when using a different MongoDB instance or port.

Do not commit ".env" files or expose database credentials.

7. Start the application

From the project root, run:

npm run dev

The command starts the backend and frontend development servers.

Default local addresses:

Service| Address
Frontend| http://localhost:5173
Backend API| http://localhost:4000
Backend health| http://localhost:4000/healthz
Backend readiness| http://localhost:4000/readyz

Open the frontend address in a modern browser.

8. Verify the installation

Check the backend health endpoint:

Invoke-RestMethod http://localhost:4000/healthz

Check database readiness:

Invoke-RestMethod http://localhost:4000/readyz

The readiness endpoint should report a ready status and a connected database.

Open the application in the browser and verify that the interface loads and resource records can be viewed.

9. Build for production

Run the frontend production build:

npm run build

Vite generates the production files in:

client/dist/

The Express application is configured to serve this directory when it exists.

Start the backend:

npm start

The backend uses the configured "PORT" environment variable, defaulting to port "4000".

For a production deployment, configure a transaction-capable managed MongoDB database and supply its connection string through the hosting platform's environment-variable settings.

10. Run automated tests

From the project root:

npm test

The root test script runs the server workspace's automated test suite.

Run the production build check separately:

npm run build

These commands do not replace manual browser testing of offline operation, reconnection, and conflict handling.

11. Local data and troubleshooting

Browser data

ResourceSync uses IndexedDB for locally stored resources, pending operations, processed-operation records, and resource movement history.

Clearing browser site data can permanently remove unsynchronized local records and pending operations.

Do not clear the application's browser storage while pending operations need to be synchronized.

MongoDB connection failure

Check that:

- MongoDB is running.
- The configured connection string is correct.
- The replica set is initialized.
- A PRIMARY member is available.
- The database connection is permitted by the host and network configuration.

Port conflicts

If port "4000" is already in use, change "PORT" in "server/.env".

If Vite's default port is occupied, use the port reported by the Vite development server.

Browser storage issues

Use a modern browser with IndexedDB support. Avoid private browsing configurations that prevent persistent site storage.

12. Security notes

- Use synthetic demonstration data.
- Never commit database credentials.
- Keep local development MongoDB bound to localhost unless a properly secured configuration is required.
- Do not expose an unauthenticated deployment to real organisational or sensitive data.
- Configure appropriate access controls and database permissions before production use.