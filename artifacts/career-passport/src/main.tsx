import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (import.meta.env.DEV) {
  const _previewToken = new URLSearchParams(window.location.search).get("_token");
  if (_previewToken) {
    localStorage.setItem("career_passport_token", _previewToken);
    try {
      const payload = JSON.parse(atob(_previewToken.split(".")[1]));
      localStorage.setItem("career_passport_user", JSON.stringify({
        id: payload.userId,
        email: payload.email,
        companyId: payload.companyId,
        companyName: payload.companyName || "Acme Corp",
        role: payload.role || "admin",
        employeeId: payload.employeeId ?? null,
      }));
    } catch { /* ignore decode errors */ }
    const clean = new URL(window.location.href);
    clean.searchParams.delete("_token");
    window.history.replaceState(null, "", clean.toString());
  }
}

createRoot(document.getElementById("root")!).render(<App />);
