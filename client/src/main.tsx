// client/src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ErrorBoundary } from "./ErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// ↓ Add this block below
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}
