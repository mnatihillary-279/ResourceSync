import { getDatabase } from "../config/database.js";
import { compareChanges } from "./conflictPolicy.js";

function toPublicResource(document) {
  if (!document) return null;
  const { _id, ...fields } = document;
  return { id: _id, ...fields };
}

export async function applyOperation(operation) {
  const database = getDatabase();
  const resources = database.collection("resources");
  const receipts = database.collection("operationReceipts");
  const conflicts = database.collection("conflicts");
  const session = database.client.startSession();

  let result;

  try {
    await session.withTransaction(async () => {
      const existingReceipt = await receipts.findOne(
        { _id: operation.operationId },
        { session }
      );

      if (existingReceipt) {
        const current = await resources.findOne(
          { _id: operation.recordId },
          { session }
        );

        result = {
          acknowledged: true,
          duplicate: true,
          outcome: existingReceipt.outcome,
          processedAt: existingReceipt.processedAt,
          resource: toPublicResource(current)
        };
        return;
      }

      const current = await resources.findOne(
        { _id: operation.recordId },
        { session }
      );

      const incomingChange = {
        clientTimestamp: operation.clientTimestamp,
        deviceId: operation.deviceId
      };

      const incomingWins = !current || compareChanges(incomingChange, current) >= 0;
      const versionConflict = Boolean(current && operation.baseVersion !== current.version);
      const processedAt = new Date();

      let outcome;
      let nextResource = current;

      if (incomingWins) {
        const payload = operation.type === "DELETE"
          ? (current || { _id: operation.recordId })
          : operation.payload;

        nextResource = {
          ...(current || {}),
          ...(payload || {}),
          _id: operation.recordId,
          version: (current?.version || 0) + 1,
          updatedAt: operation.clientTimestamp,
          deviceId: operation.deviceId,
          deleted: operation.type === "DELETE"
        };

        await resources.replaceOne(
          { _id: operation.recordId },
          nextResource,
          { upsert: true, session }
        );

        outcome = versionConflict ? "conflict_incoming_won" : "applied";
      } else {
        outcome = "conflict_remote_won";
      }

      if (versionConflict) {
        await conflicts.insertOne({
          operationId: operation.operationId,
          recordId: operation.recordId,
          incoming: {
            type: operation.type,
            payload: operation.payload,
            baseVersion: operation.baseVersion,
            clientTimestamp: operation.clientTimestamp,
            deviceId: operation.deviceId
          },
          retained: {
            name: current.name,
            category: current.category,
            quantity: current.quantity,
            minimumStock: current.minimumStock,
            location: current.location,
            version: current.version,
            updatedAt: current.updatedAt,
            deviceId: current.deviceId,
            deleted: current.deleted
          },
          resolution: "last_write_wins",
          outcome,
          createdAt: processedAt
        }, { session });
      }

      await receipts.insertOne({
        _id: operation.operationId,
        recordId: operation.recordId,
        processedAt,
        outcome
      }, { session });

      result = {
        acknowledged: true,
        duplicate: false,
        outcome,
        processedAt,
        resource: toPublicResource(nextResource)
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

export async function listResources() {
  const documents = await getDatabase()
    .collection("resources")
    .find({})
    .sort({ updatedAt: -1 })
    .toArray();

  return documents.map(toPublicResource);
}

export async function listConflicts() {
  return getDatabase()
    .collection("conflicts")
    .find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .project({ _id: 0 })
    .toArray();
}
