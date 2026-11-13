import { MongoClient } from "mongodb";

let client;
let database;

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required. Configure an approved MongoDB service.");
  }

  client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000
  });

  await client.connect();
  database = client.db(process.env.MONGODB_DATABASE || "resourcesync");

  await Promise.all([
    database.collection("resources").createIndex({ updatedAt: -1 }),
    database.collection("operationReceipts").createIndex({ processedAt: -1 }),
    database.collection("conflicts").createIndex({ createdAt: -1 })
  ]);

  return database;
}

export function getDatabase() {
  if (!database) throw new Error("Database has not been initialized.");
  return database;
}

export async function closeDatabase() {
  if (client) await client.close();
}
