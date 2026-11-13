const DATABASE_NAME = "resourcesync-local";
const DATABASE_VERSION = 1;

let databasePromise;

function openDatabase() {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains("resources")) {
        database.createObjectStore("resources", { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains("pendingOperations")) {
        const operations = database.createObjectStore("pendingOperations", {
          keyPath: "sequence",
          autoIncrement: true
        });
        operations.createIndex("operationId", "operationId", { unique: true });
      }

      if (!database.objectStoreNames.contains("processedOperations")) {
        database.createObjectStore("processedOperations", { keyPath: "operationId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Database upgrade is blocked by another open tab."));
  });

  return databasePromise;
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadSnapshot() {
  const database = await openDatabase();
  const transaction = database.transaction(
    ["resources", "pendingOperations", "processedOperations"],
    "readonly"
  );

  const [resources, pendingOperations, processedOperations] = await Promise.all([
    requestResult(transaction.objectStore("resources").getAll()),
    requestResult(transaction.objectStore("pendingOperations").getAll()),
    requestResult(transaction.objectStore("processedOperations").getAll())
  ]);

  pendingOperations.sort((a, b) => a.sequence - b.sequence);

  return { resources, pendingOperations, processedOperations };
}

export async function commitLocalOperation(resource, operation) {
  const database = await openDatabase();
  const transaction = database.transaction(
    ["resources", "pendingOperations"],
    "readwrite"
  );

  transaction.objectStore("resources").put(resource);
  transaction.objectStore("pendingOperations").add(operation);

  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("Local transaction aborted."));
  });
}

export async function getNextPendingOperation() {
  const database = await openDatabase();
  const transaction = database.transaction("pendingOperations", "readonly");
  const request = transaction.objectStore("pendingOperations").openCursor();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ? request.result.value : null);
    request.onerror = () => reject(request.error);
  });
}

export async function acknowledgeOperation(operation, canonicalResource, receipt) {
  const database = await openDatabase();
  const transaction = database.transaction(
    ["resources", "pendingOperations", "processedOperations"],
    "readwrite"
  );

  const pendingStore = transaction.objectStore("pendingOperations");
  const resourcesStore = transaction.objectStore("resources");
  const processedStore = transaction.objectStore("processedOperations");

  pendingStore.delete(operation.sequence);
  processedStore.put({
    operationId: operation.operationId,
    processedAt: receipt.processedAt,
    outcome: receipt.outcome
  });

  const allPending = await requestResult(pendingStore.getAll());
  const hasLaterWorkForRecord = allPending.some(
    (item) => item.recordId === operation.recordId
  );

  if (!hasLaterWorkForRecord && canonicalResource) {
    resourcesStore.put(canonicalResource);
  }

  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("Acknowledgment transaction aborted."));
  });
}

export async function mergeRemoteResources(remoteResources) {
  const database = await openDatabase();
  const transaction = database.transaction(
    ["resources", "pendingOperations"],
    "readwrite"
  );

  const resourcesStore = transaction.objectStore("resources");
  const pendingStore = transaction.objectStore("pendingOperations");

  const [pending, localResources] = await Promise.all([
    requestResult(pendingStore.getAll()),
    requestResult(resourcesStore.getAll())
  ]);

  const pendingRecordIds = new Set(pending.map((operation) => operation.recordId));
  const remoteIds = new Set(remoteResources.map((resource) => resource.id));

  for (const remoteResource of remoteResources) {
    if (!pendingRecordIds.has(remoteResource.id)) {
      resourcesStore.put(remoteResource);
    }
  }

  // Do not remove local-only records while there are pending changes.
  // A remote snapshot is merged, not treated as an authoritative delete list.
  for (const localResource of localResources) {
    if (!remoteIds.has(localResource.id) && pendingRecordIds.has(localResource.id)) {
      resourcesStore.put(localResource);
    }
  }

  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("Remote merge transaction aborted."));
  });
}


export async function removeAlreadyAcknowledgedOperation(sequence) {
  const database = await openDatabase();
  const transaction = database.transaction("pendingOperations", "readwrite");
  transaction.objectStore("pendingOperations").delete(sequence);

  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("Queue cleanup aborted."));
  });
}
