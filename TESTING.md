Testing Guide

1. Overview

ResourceSync uses automated tests to verify its conflict-resolution policy and Resource Rescue Engine.

The automated tests use Node.js's built-in test runner and the Node.js assertion module.

2. Prerequisites

- Node.js installed.
- Project dependencies installed using "npm install".
- Run commands from the project root directory.

3. Running Automated Tests

Run the complete test suite:

npm test

The root test script executes:

1. Server conflict-policy tests.
2. Client Resource Rescue Engine tests.

Individual Test Groups

Run conflict-policy tests:

npm run test --workspace server

Run Resource Rescue Engine tests:

node --test client/test/resourceRescue.test.js

4. Automated Test Coverage

4.1 Conflict Policy

Location: "server/test/conflictPolicy.test.js"

The three tests verify:

Test| Expected behaviour
Later timestamp wins| A change with a later timestamp takes precedence.
Device ID tie-break| Device ID provides deterministic ordering when timestamps match.
Equal changes| Identical timestamps and device IDs produce an equal comparison result.

4.2 Resource Rescue Engine

Location: "client/test/resourceRescue.test.js"

The eight tests verify:

1. Recommends transferring surplus stock to a shortage location.
2. Distributes available surplus across multiple shortage locations.
3. Does not recommend transfers when no surplus exists.
4. Does not match resources belonging to different categories.
5. Matches resource names without case sensitivity.
6. Ignores deleted and invalid records.
7. Rejects input that is not an array.
8. Rejects recommendations when duplicate resource records exist at one location.

5. Verified Automated Test Results

Test execution date: 13 November 2026

The complete "npm test" command was executed successfully.

Test group| Tests| Passed| Failed
Conflict policy| 3| 3| 0
Resource Rescue Engine| 8| 8| 0
Total| 11| 11| 0

All 11 automated tests passed.

6. Additional Manual Testing

The following application behaviours should also be checked manually:

- Create and update resource records.
- Verify that inventory changes persist after refreshing the application.
- Disconnect the network and verify that locally available functionality continues working.
- Create offline changes and reconnect to verify synchronization.
- Verify that pending operations are retained when synchronization fails.
- Verify that duplicate operation IDs are handled without applying the same operation twice.
- Verify that conflicting updates produce the expected resolution and conflict records.
- Verify that Resource Rescue recommendations reflect current quantities and minimum stock levels.
- Verify that consumption and movement history behave as expected.

These are manual verification scenarios, not additional automated tests reported in the 11-test result above.

7. Limitations

Passing automated tests does not establish that every application workflow has been tested.

The current automated suite specifically covers conflict-policy comparison and Resource Rescue Engine behaviour. Full end-to-end, browser, network-failure, concurrent synchronization and deployment testing require separate verification.