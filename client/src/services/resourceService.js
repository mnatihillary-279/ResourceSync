import {
  commitLocalOperation,
  loadSnapshot
} from "./database.js";

export const recordMap = new Map();
export const processedOperationIds = new Set();

let deviceId = localStorage.getItem("resourcesync-device-id");

if (!deviceId) {
  deviceId = crypto.randomUUID();
  localStorage.setItem("resourcesync-device-id", deviceId);
}

export async function initializeResourceState() {
  const snapshot = await loadSnapshot();

  recordMap.clear();
  processedOperationIds.clear();

  for (const resource of snapshot.resources) {
    recordMap.set(resource.id, resource);
  }

  for (const operation of snapshot.processedOperations) {
    processedOperationIds.add(operation.operationId);
  }

  return snapshot;
}

function makeOperation(type, resource) {
  return {
    operationId: crypto.randomUUID(),
    recordId: resource.id,
    type,
    payload: type === "DELETE" ? null : {
      name: resource.name,
      category: resource.category,
      quantity: resource.quantity,
      minimumStock: resource.minimumStock,
      location: resource.location
    },
    baseVersion: Math.max(0, (resource.version || 0) - 1),
    clientTimestamp: new Date().toISOString(),
    deviceId
  };
}

async function persistMutation(type, resource) {
  const operation = makeOperation(type, resource);
  await commitLocalOperation(resource, operation);
  recordMap.set(resource.id, resource);
  return operation;
}

export async function createResource(input) {
  const now = new Date().toISOString();
  const resource = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    category: input.category.trim(),
    quantity: Number(input.quantity),
    minimumStock: Number(input.minimumStock),
    location: input.location.trim(),
    version: 1,
    updatedAt: now,
    deviceId,
    deleted: false
  };

  await persistMutation("CREATE", resource);
  return resource;
}

export async function updateResource(id, input) {
  const current = recordMap.get(id);
  if (!current || current.deleted) throw new Error("Resource not found.");

  const resource = {
    ...current,
    version: current.version + 1,
    name: input.name.trim(),
    category: input.category.trim(),
    quantity: Number(input.quantity),
    minimumStock: Number(input.minimumStock),
    location: input.location.trim(),
    updatedAt: new Date().toISOString(),
    deviceId
  };

  await persistMutation("UPDATE", resource);
  return resource;
}

export async function deleteResource(id) {
  const current = recordMap.get(id);
  if (!current || current.deleted) throw new Error("Resource not found.");

  const tombstone = {
    ...current,
    version: current.version + 1,
    deleted: true,
    updatedAt: new Date().toISOString(),
    deviceId
  };

  await persistMutation("DELETE", tombstone);
  return tombstone;
}
