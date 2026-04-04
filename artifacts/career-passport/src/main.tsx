import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (import.meta.env.DEV) {
  const _previewToken = new URLSearchParams(window.location.search).get("_token");
  if (_previewToken) {
    localStorage.setItem("career_passport_token", _previewToken);
    const clean = new URL(window.location.href);
    clean.searchParams.delete("_token");
    window.history.replaceState(null, "", clean.toString());
  }
}

createRoot(document.getElementById("root")!).render(<App />);
