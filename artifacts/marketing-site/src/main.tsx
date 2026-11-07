import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root")!;
if (root.hasChildNodes()) {
  hydrateRoot(root, <App ssrPath={`${window.location.pathname}${window.location.search}`} />);
} else {
  createRoot(root).render(<App />);
}
