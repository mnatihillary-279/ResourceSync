# Challenge B acceptance checklist

The official challenge requires the following evidence. Do not mark a test passed until it has been run and recorded.

- [ ] Create a resource online; verify local and remote state.
- [ ] Create a resource offline; verify immediate UI update and pending state.
- [ ] Edit and delete resources offline.
- [ ] Reload the browser while offline; verify records and pending operations remain.
- [ ] Reconnect; verify operations are applied in FIFO order.
- [ ] Simulate a failed sync request; verify the head operation remains pending with the same ID.
- [ ] Simulate a lost acknowledgement after the server commits; retry the same ID and verify no duplicate mutation.
- [ ] Use two independent browser profiles/sessions to edit the same record offline; verify deterministic conflict resolution and visible conflict history.
- [ ] Delete a record offline, then reconnect; verify the tombstone prevents stale copies from resurrecting it.
- [ ] Verify remote records and processed-operation receipts survive a permitted backend restart/redeployment.
- [ ] Verify `GET /healthz` and the hosted application over the assigned HTTPS URL.

## DSA evidence

- [ ] Show FIFO enqueue/dequeue order.
- [ ] Show the record `Map` keyed by record ID and explain average O(1) lookup/update.
- [ ] Show the processed-operation `Set` and explain average O(1) membership/insertion.
- [ ] Show that failed operations remain pending and retain their original IDs.
- [ ] Explain queue/map/set memory as O(r + p + d), excluding payload sizes.
- [ ] Explain that browser IndexedDB and server persistence/network operations have costs beyond in-memory O(1) collection operations.

## SDG

The sample domain is synthetic medical-supply inventory, connected to SDG 3 (Good Health and Well-Being). Do not enter real patient data.
