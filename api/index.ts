import type { VercelRequest, VercelResponse } from "@vercel/node";
import express, { type Express } from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let app: Express | null = null;

async function getApp(): Promise<Express> {
  if (app) return app;
  
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Import and register routes dynamically
  const { registerRoutes } = await import("../server/routes.js");
  await registerRoutes(app);

  // Serve static files
  const { serveStatic } = await import("../server/vite.js");
  serveStatic(app);
  
  const clientDir = path.join(__dirname, "..", "dist", "public");
  app.use(express.static(clientDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDir, "index.html"));
  });
  
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expressApp = await getApp();
  
  // Convert Vercel request to Express-compatible request
  const mockReq = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    query: req.query,
  } as any;
  
  // Call Express app with converted request
  return new Promise<void>((resolve, reject) => {
    expressApp(mockReq, res as any, (err?: any) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
