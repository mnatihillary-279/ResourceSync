ResourceSync System Architecture

1. Overview

ResourceSync is an offline-first resource tracking application developed for the Zetech Forge Alumni × Student Hackathon 2026 — Software Development Challenge B.

The system allows users to manage resource records when internet connectivity is unavailable. Local changes are persisted in the browser and submitted to a central MongoDB database when connectivity becomes available.

The architecture combines:

- React frontend
- Node.js and Express backend
- MongoDB central persistence
- IndexedDB local persistence
- FIFO synchronization queue
- Record "Map"
- Processed-operation "Set"
- Deterministic conflict-resolution policy
- Resource Rescue Engine

2. High-level architecture

                 USER
                  |
                  v
          REACT APPLICATION
                  |
          Resource Services
                  |
        +---------+----------+
        |                    |
        v                    v
   IndexedDB             In-memory
   Local Storage         Data Structures
        |                - Record Map
        |                - Processed Set
        |                    |
        v                    |
   Pending Operations        |
        |                    |
        +---------+----------+
                  |
                  v
          Synchronization Service
                  |
             HTTP Request
                  |
                  v
           EXPRESS BACKEND
                  |
             API Routes
                  |
            Sync Controller
                  |
             Sync Service
                  |
          MongoDB Transaction
                  |
       +----------+-----------+
       |          |           |
       v          v           v
   Resources  Operation   Conflicts
              Receipts

The React development server and Express API run separately during development. In the production configuration, Express serves the built React application and API from the same origin.

3. Frontend architecture

3.1 React application

The React application provides the user interface for:

- Viewing resource records
- Creating resources
- Editing resource information
- Deleting resources
- Recording consumption
- Viewing synchronization status
- Reviewing conflict information
- Viewing Resource Rescue Engine recommendations

The interface communicates with the resource and synchronization services.

3.2 Resource service

File:

"client/src/services/resourceService.js"

Responsibilities:

- Initialize local resource state.
- Generate resource and operation identifiers.
- Create, update, and delete resource records.
- Record consumption events.
- Persist local changes before synchronization.
- Maintain the in-memory record map and processed-operation set.

Each device receives a locally generated device ID, stored in browser "localStorage".

Each mutation receives a unique operation ID generated using "crypto.randomUUID()".

3.3 IndexedDB persistence

File:

"client/src/services/database.js"

Database name:

"resourcesync-local"

Database version:

"2"

IndexedDB contains four object stores:

Object store| Purpose
"resources"| Locally persisted resource records
"pendingOperations"| Operations awaiting synchronization
"processedOperations"| Locally acknowledged operation receipts
"resourceMovements"| Local resource movement history

The pending-operation store uses an auto-incrementing "sequence" key to preserve enqueue order. It also has a unique index on "operationId".

Local resource mutations and their pending operations are committed together in an IndexedDB read-write transaction.

This allows the application to retain changes locally when the network is unavailable.

3.4 In-memory data structures

File:

"client/src/services/resourceService.js"

Record Map

The application maintains a JavaScript "Map" named "recordMap".

- Key: resource ID
- Value: resource record

Average lookup, insertion, and update complexity is O(1).

The map is reconstructed from the local IndexedDB snapshot during initialization and refreshed after synchronization acknowledgements.

Processed-operation Set

The application maintains a JavaScript "Set" named "processedOperationIds".

It stores operation IDs that have already been acknowledged and persisted locally.

Average membership checking and insertion complexity is O(1).

The "Map" and "Set" improve in-memory access but are not substitutes for durable IndexedDB storage.

4. Synchronization architecture

File:

"client/src/services/syncService.js"

The synchronization service submits pending operations to the backend.

4.1 FIFO processing

Pending operations are retrieved from the IndexedDB object store in sequence order.

The synchronization service processes one operation at a time.

The next operation is submitted only after the current operation receives a valid acknowledgement.

This preserves FIFO processing order.

4.2 Synchronization workflow

1. Check that the browser is online.
2. Prevent another synchronization loop from running simultaneously.
3. Retrieve the oldest pending operation.
4. Check whether its operation ID is already acknowledged locally.
5. Submit the operation to "POST /api/sync".
6. Verify that the server acknowledges the operation.
7. Remove the acknowledged operation from the pending queue.
8. Persist its acknowledgement in the processed-operation store.
9. Update the canonical local resource when no later pending operation exists for that record.
10. Reload the local snapshot and rebuild the in-memory data structures.
11. Continue until the queue is empty or connectivity is lost.

4.3 Failed requests and retries

If a request fails or the server does not acknowledge an operation, the synchronization function throws an error.

The failed operation is not acknowledged or removed from the queue by that failed request.

Its original operation ID remains available for a later retry.

This supports retrying the same operation without intentionally generating a new identifier.

The backend also maintains operation receipts to recognize previously processed operation IDs.

5. Backend architecture

5.1 Express application

Files:

- "server/src/server.js"
- "server/src/app.js"

The server:

- Loads environment configuration.
- Connects to MongoDB before accepting requests.
- Listens on the configured port.
- Binds to "0.0.0.0".
- Configures Helmet security headers.
- Limits JSON request bodies to 100 KB.
- Exposes health and readiness endpoints.
- Serves API routes.
- Serves the production frontend build when available.
- Handles application shutdown signals.

5.2 API routes

File:

"server/src/routes/apiRoutes.js"

The API supports resource retrieval, conflict retrieval, and synchronization operations.

Endpoint| Purpose
"GET /healthz"| Checks whether the application process responds
"GET /readyz"| Checks whether the database is reachable
"GET /api/resources"| Retrieves remote resource records
"GET /api/conflicts"| Retrieves recent conflict records
"POST /api/sync"| Submits a pending operation for processing

5.3 MongoDB collections

File:

"server/src/config/database.js"

The backend uses three collections:

Collection| Purpose
"resources"| Stores central resource records
"operationReceipts"| Records processed operation IDs and outcomes
"conflicts"| Stores conflict details and resolution outcomes

The database creates indexes on resource update timestamps, operation receipt processing timestamps, and conflict creation timestamps.

The operation receipt ID is stored as MongoDB "_id", which provides uniqueness for each operation ID.

6. Conflict-resolution algorithm

Files:

- "server/src/services/conflictPolicy.js"
- "server/src/services/syncService.js"

ResourceSync uses a deterministic Last-Write-Wins (LWW) policy.

When an operation reaches the server, the backend:

1. Checks whether its operation ID already has a receipt.
2. Retrieves the current remote resource.
3. Compares the incoming client timestamp and device ID against the stored resource.
4. Checks whether the operation's "baseVersion" differs from the current remote version.
5. Applies the incoming change if it wins the comparison.
6. Retains the remote version if the incoming change loses.
7. Records conflict information when a version mismatch is detected.
8. Stores the operation receipt.

6.1 Comparison rules

The conflict policy uses:

- Client timestamp as the primary comparison value.
- Device ID as the deterministic tie-breaker.

If both comparison values are equal, the comparator treats the changes as equal.

6.2 Version conflicts

A version conflict occurs when:

"operation.baseVersion !== current.version"

A version mismatch does not automatically mean the incoming operation wins or loses. The timestamp and device-ID comparison determines the selected version.

The backend records the incoming change, retained version, resolution label, and outcome when a version conflict is detected.

6.3 Transactional processing

The backend processes resource updates, conflict records, and operation receipts inside a MongoDB transaction.

This helps keep these database changes consistent: either the transaction commits, or its database changes are rolled back.

MongoDB must therefore support multi-document transactions. A suitable replica-set or sharded deployment is required.

7. Resource Rescue Engine

File:

"client/src/services/resourceRescue.js"

The Resource Rescue Engine identifies potential resource transfers between locations.

It compares resource records using normalized resource names and categories.

7.1 Surplus calculation

"Surplus = max(0, Quantity - Minimum Stock)"

7.2 Shortage calculation

"Shortage = max(0, Minimum Stock - Quantity)"

7.3 Transfer calculation

"Transfer Quantity = min(Remaining Surplus, Remaining Shortage)"

The engine recommends transfers without allowing a source location to fall below its minimum-stock threshold or a destination to receive more than its calculated shortage.

7.4 Allocation approach

The current implementation uses deterministic alphabetical ordering of locations when allocating available surplus to shortage locations.

This makes recommendations reproducible but does not optimize travel distance, urgency, or transportation cost.

The engine:

- Excludes deleted and invalid records.
- Matches resources by normalized name and category.
- Handles multiple source and destination locations.
- Avoids using ambiguous duplicate resource records at the same normalized location.
- Produces explanations for recommendations.

Recommendations are advisory. They do not physically move stock, automatically modify inventory, or create synchronization operations.

8. Resource movement history

Resource movement events are stored in the browser's "resourceMovements" IndexedDB object store.

Consumption events record details such as:

- Resource ID
- Resource name
- Category
- Location
- Movement type
- Quantity
- Occurrence timestamp
- Device ID

Recording consumption also updates the resource quantity and creates an update operation for synchronization.

The movement event itself is currently stored locally. It is not independently uploaded to the central MongoDB collections.

9. Security considerations

Current security controls include:

- Helmet security headers.
- Disabled Express "x-powered-by" header.
- JSON request-size limit.
- Environment-based database configuration.
- Unique operation receipt IDs.
- MongoDB transaction processing.

Current limitations include:

- No implemented user authentication.
- No role-based access control.
- No organisation-level data isolation.
- No server-side ownership verification for resource records.
- Client timestamps may be affected by device clock differences.

The application should use synthetic demonstration data only until appropriate authentication, authorization, and organisational data protections are implemented.

10. Complexity analysis

Let:

- "r" = number of resource records
- "p" = number of pending operations
- "d" = number of processed operation IDs

Structure or operation| Expected complexity
Record Map lookup| Average O(1)
Record Map insertion/update| Average O(1)
Processed Set membership| Average O(1)
Processed Set insertion| Average O(1)
FIFO queue retrieval| O(1) for retrieving the first cursor result
Loading and sorting pending operations| O(p log p)
Rebuilding the record Map| O(r)
Rebuilding the processed Set| O(d)

The combined in-memory space usage of the Map, Set, and pending queue is O(r + p + d), excluding payload sizes and the additional storage used by IndexedDB and MongoDB.

These are data-structure complexity estimates. They do not represent the full cost of browser storage operations, network requests, database queries, or transactions.

11. Known limitations and future improvements

The current implementation can be extended with:

- User authentication and authorization.
- Organisation and location access controls.
- Server-side resource movement history.
- Improved concurrent duplicate-operation handling.
- Clock-skew-resistant conflict resolution.
- More advanced transfer allocation based on urgency and distance.
- Expanded automated offline and multi-device integration tests.
- Monitoring and audit reporting.

These are improvement areas, not features that should be considered implemented until verified in the application.