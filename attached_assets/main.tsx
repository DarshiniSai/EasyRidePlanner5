import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Simplified version without Clerk authentication for demo
createRoot(document.getElementById("root")!).render(
  <App />
);
