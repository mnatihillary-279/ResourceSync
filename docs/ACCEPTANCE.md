ResourceSync – Acceptance Criteria

1. Purpose

This document defines the functional, technical and operational acceptance criteria for ResourceSync, developed for the Zetech Forge Alumni × Student Hackathon 2026, Software Development Challenge B: Offline-First Resource Tracker.

It provides a checklist for evaluating the implementation against the challenge requirements.

2. Functional Acceptance Criteria

ID| Requirement| Acceptance condition
AC-01| Resource management| Users can manage resource records and their stock information.
AC-02| Stock monitoring| The application compares available quantities against minimum stock levels.
AC-03| Offline operation| Core resource functionality remains available when the network connection is unavailable.
AC-04| Local persistence| Offline changes are retained in IndexedDB.
AC-05| Synchronization| Pending local operations are sent to the backend when connectivity is restored.
AC-06| Failure handling| Unsuccessful synchronization does not prematurely remove pending operations.
AC-07| Duplicate protection| Previously processed operation IDs are recognized to prevent duplicate application.
AC-08| Conflict resolution| Conflicting updates are resolved using the defined timestamp and device-ID comparison policy.
AC-09| Resource Rescue| The application identifies eligible surplus stock and recommends transfers to locations experiencing shortages.
AC-10| Movement and consumption history| The application records and displays supported local consumption and movement information.

3. Data Structures and Algorithms

The implementation must demonstrate the following data structures and algorithms.

Requirement| Implementation| Acceptance condition
Durable FIFO synchronization queue| IndexedDB "pendingOperations" store with auto-increment ordering| Pending operations are processed in insertion order.
Record map| JavaScript "Map"| Resource records can be accessed efficiently by their identifiers.
Operation-ID set| JavaScript "Set" and persisted processed-operation records| Previously processed operation IDs can be identified.
Conflict-resolution algorithm| Last-write-wins comparison using client timestamps and device IDs| Competing changes receive a deterministic comparison result.
Persistent backend storage| MongoDB| Synchronized resource information and operation receipts are persisted.
Transactional synchronization| MongoDB transactions| Related resource, conflict and receipt changes are committed together.

4. Resource Rescue Engine

The Resource Rescue Engine must:

- Identify surplus stock above a resource's minimum stock level.
- Identify shortages below minimum stock levels.
- Match resources using their names and categories.
- Generate recommendations without exceeding available surplus or the destination's shortage.
- Distribute available surplus across eligible shortage locations.
- Reject invalid input and avoid recommendations involving invalid or deleted records.
- Avoid recommending transfers when duplicate resource records exist at the same normalized location.

Recommendations are advisory. They do not represent completed physical stock transfers.

The current recommendation logic does not optimize transfers using geographical distance, urgency or transportation cost.

5. Security and Data Integrity

The implementation should:

- Validate incoming API data.
- Apply HTTP security headers.
- Limit request body size.
- Protect environment configuration and database credentials.
- Prevent duplicate operation processing.
- Maintain consistency between resource updates, conflict records and operation receipts.

Known limitation: Authentication, authorization, role-based access control and organization-level data isolation are not currently implemented. Public deployment must therefore use synthetic demonstration data only until appropriate access controls are added.

6. Verification Evidence

6.1 Automated tests

Verification date: 13 November 2026

The complete "npm test" command executed successfully.

Test group| Total| Passed| Failed
Conflict policy| 3| 3| 0
Resource Rescue Engine| 8| 8| 0
Total| 11| 11| 0

The tests verify conflict comparison and Resource Rescue recommendation behaviour.

6.2 Production build

The client production build was executed successfully using:

npm run build

Vite completed the build without errors.

6.3 Database transaction verification

A local MongoDB replica-set transaction was previously tested successfully. This verifies that the local database environment can commit a transaction.

It does not, by itself, establish that every synchronization scenario has been tested.

7. Outstanding Manual Acceptance Checks

The following checks must be completed and recorded before claiming full acceptance.

- [ ] Create, edit and delete resource records.
- [ ] Verify resource persistence after application refresh.
- [ ] Disconnect the network and verify offline resource operations.
- [ ] Reconnect and verify that pending operations synchronize in FIFO order.
- [ ] Simulate synchronization failure and verify that pending operations remain available for retry.
- [ ] Verify duplicate operation handling through repeated synchronization requests.
- [ ] Test conflicting updates from different devices.
- [ ] Verify that conflict records and operation receipts persist correctly.
- [ ] Verify consumption and movement history behaviour.
- [ ] Verify Resource Rescue recommendations using the synthetic demonstration records.
- [ ] Test the application in a clean browser session.
- [ ] Verify the production application on the intended hosting platform.
- [ ] Confirm database transaction support in the production environment.
- [ ] Verify that environment variables and database credentials are configured securely.

8. Deployment Acceptance

Before deployment can be considered successful:

- The application must build successfully in the hosting environment.
- The backend must start using the platform's assigned port.
- The application must connect to a transaction-capable MongoDB deployment.
- The health and readiness endpoints must return the expected responses.
- The frontend and backend must operate correctly from the deployed application.
- Offline operation and subsequent synchronization must be tested against the deployed environment.
- Only synthetic demonstration data should be used while authentication and authorization are absent.

9. Acceptance Status

As of 13 November 2026:

Area| Current status
Automated conflict-policy tests| Verified – 3 passed
Automated Resource Rescue tests| Verified – 8 passed
Combined automated test suite| Verified – 11 passed
Client production build| Verified
Local MongoDB transaction| Previously verified
Full manual offline/synchronization scenarios| Outstanding
Production deployment| Outstanding
Production security controls| Incomplete

Overall status: Core implementation and selected automated checks are verified. Full acceptance remains subject to completion of the outstanding manual, deployment and security checks.