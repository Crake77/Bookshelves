import express from "express";
import { registerRoutes } from "../server/routes";
import { serveStatic } from "../server/vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize routes
await registerRoutes(app);

// Serve static files in production
serveStatic(app);
const clientDir = path.join(__dirname, "..", "dist", "public");
app.use(express.static(clientDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDir, "index.html"));
});

export default app;
