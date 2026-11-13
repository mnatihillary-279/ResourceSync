import {
  acknowledgeOperation,
  getNextPendingOperation,
  loadSnapshot,
  mergeRemoteResources,
  removeAlreadyAcknowledgedOperation
} from "./database.js";
import { processedOperationIds, recordMap } from "./resourceService.js";

let synchronizationInProgress = false;

export async function synchronizePendingOperations() {
  if (synchronizationInProgress) return { synchronized: 0, busy: true };
  if (!navigator.onLine) throw new Error("The browser is offline.");

  synchronizationInProgress = true;
  let synchronized = 0;

  try {
    while (navigator.onLine) {
      const operation = await getNextPendingOperation();
      if (!operation) break;

      // A locally persisted acknowledgment proves this ID was already accepted.
      // This is a recovery guard for an inconsistent/stale queue entry.
      if (processedOperationIds.has(operation.operationId)) {
        await removeAlreadyAcknowledgedOperation(operation.sequence);
        continue;
      }

      // The same ID is retained across every retry.
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(operation)
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Synchronization failed (${response.status}).`);
      }

      const result = await response.json();
      if (!result.acknowledged) {
        throw new Error("Server did not acknowledge the operation; it remains queued.");
      }

      await acknowledgeOperation(
        operation,
        result.resource,
        {
          processedAt: result.processedAt,
          outcome: result.outcome
        }
      );

      processedOperationIds.add(operation.operationId);

      // Rebuild the in-memory record map from the durable local snapshot so
      // subsequent edits use the server's canonical version and conflict result.
      const snapshot = await loadSnapshot();
      recordMap.clear();
      for (const resource of snapshot.resources) recordMap.set(resource.id, resource);

      synchronized += 1;
    }

    return { synchronized, busy: false };
  } finally {
    synchronizationInProgress = false;
  }
}

export async function refreshFromServer() {
  const response = await fetch("/api/resources");
  if (!response.ok) throw new Error("Could not retrieve remote resources.");

  const resources = await response.json();
  await mergeRemoteResources(resources);
  return loadSnapshot();
}
