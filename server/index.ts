// server/index.ts
// Environment variables are loaded by load-env.cjs via --require flag

// Set NODE_ENV to development if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}

import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("env", process.env.NODE_ENV || "development");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple API logger + capture JSON response safely
app.use((req, res, next) => {
  const start = Date.now();
  const p = req.path;
  let captured: any;

  const origJson = res.json; // keep original reference
  (res as any).json = function (body: any, ...args: any[]) {
    captured = body;
    // Use .call() to avoid TS tuple/spread complaints
    return (origJson as any).call(this, body, ...args);
  };

  res.on("finish", () => {
    if (p.startsWith("/api")) {
      let line = `${req.method} ${p} ${res.statusCode} in ${Date.now() - start}ms`;
      if (captured) line += ` :: ${JSON.stringify(captured)}`;
      if (line.length > 80) line = line.slice(0, 79) + "…";
      log(line);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    // In dev: serve /public (SW, manifest, icons) + Vite dev server
    const publicPath = path.resolve(__dirname, "..", "public");
    app.use(express.static(publicPath));
    await setupVite(app, server);
  } else {
    // In prod: keep your helper and also explicitly serve dist/public
    serveStatic(app);
    const clientDir = path.join(__dirname, "public"); // esbuild outputs server to /dist, client is /dist/public
    app.use(express.static(clientDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDir, "index.html"));
    });
  }

  // IMPORTANT: use Replit's assigned port
  const port = 8001;  // temporary: avoid the busy 5000 port

  server.listen(
    { port, host: "0.0.0.0" },
    () => log(`serving on port ${port}`)
  );
})();
