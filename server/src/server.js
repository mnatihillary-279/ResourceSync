import "dotenv/config";
import app from "./app.js";
import { closeDatabase, connectDatabase } from "./config/database.js";

const port = Number(process.env.PORT || 4000);
let server;

async function start() {
  await connectDatabase();

  server = app.listen(port, "0.0.0.0", () => {
    console.log(`ResourceSync listening on 0.0.0.0:${port}`);
  });
}

async function shutdown(signal) {
  console.log(`${signal} received; shutting down ResourceSync.`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await closeDatabase();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start().catch((error) => {
  console.error("Startup failed:", error.message);
  process.exit(1);
});
