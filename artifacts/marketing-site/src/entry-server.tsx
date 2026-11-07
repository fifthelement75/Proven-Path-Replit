import { renderToString } from "react-dom/server";
import App from "./App";

// Build-time rendering only: production still serves static route documents.
export function render(path: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return renderToString(<App ssrPath={`${base}${path}`} />);
}
