import express from "express";
import { registerRoutes } from "../server/routes.js";
import { serveStatic } from "../server/vite.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let app: express.Application | null = null;

async function getApp() {
  if (app) return app;
  
  app = express();
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
  
  return app;
}

export default async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}
