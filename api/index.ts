import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || "/";
  
  // Handle API routes by importing the old serverless functions
  if (url.startsWith("/api/")) {
    // For now, return a simple response - we'll handle API routes separately
    res.status(404).json({ error: "API route handler not implemented" });
    return;
  }
  
  // Serve static files
  const clientDir = path.join(__dirname, "..", "dist", "public");
  
  // Map URL to file path
  let filePath: string;
  if (url === "/" || url.startsWith("/browse") || url.startsWith("/shelf")) {
    // SPA routes - serve index.html
    filePath = path.join(clientDir, "index.html");
  } else if (url.match(/\.(js|css|png|jpg|svg|ico|json|woff|woff2)$/)) {
    // Static assets
    filePath = path.join(clientDir, url.replace(/^\//, ""));
  } else {
    // Default to index.html for unknown routes (SPA)
    filePath = path.join(clientDir, "index.html");
  }
  
  try {
    const content = readFileSync(filePath);
    
    // Set content type based on file extension
    const ext = path.extname(filePath);
    const contentTypes: Record<string, string> = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
    };
    
    const contentType = contentTypes[ext] || "text/plain";
    res.setHeader("Content-Type", contentType);
    res.status(200).send(content);
  } catch (error) {
    res.status(404).json({ error: "File not found", url });
  }
}
