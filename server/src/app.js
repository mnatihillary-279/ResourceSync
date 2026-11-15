import express from "express";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import apiRoutes from "./routes/apiRoutes.js";
import { getDatabase } from "./config/database.js";

const app = express();
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const clientBuildDirectory = path.resolve(currentDirectory, "../../client/dist");

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(express.json({ limit: "100kb" }));

app.get("[/healthz","/health"], (req, res) => {
  res.status(200).json({ status: "ok", service: "resourcesync" });
});

app.get("/readyz", async (req, res) => {
  try {
    await getDatabase().command({ ping: 1 });
    res.status(200).json({ status: "ready", database: "connected" });
  } catch {
    res.status(503).json({ status: "not_ready" });
  }
});

app.use("/api", apiRoutes);

app.use(express.static(clientBuildDirectory, {
  index: false,
  maxAge: process.env.NODE_ENV === "production" ? "1h" : 0
}));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API route not found." });
  }
  res.sendFile(path.join(clientBuildDirectory, "index.html"), (error) => {
    if (error) next(error);
  });
});

app.use((error, req, res, next) => {
  console.error("Request failed:", error.message);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: "An internal server error occurred." });
});

export default app;
