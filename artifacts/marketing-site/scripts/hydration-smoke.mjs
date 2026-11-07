// Optional production-build smoke check. Requires Chromium on PATH (or CHROMIUM_BIN).
// Uses only Node built-ins, serves local build files, and never submits forms.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { publicPaths } from "./site-config.mjs";

const dist = resolve(fileURLToPath(new URL("../dist/public/", import.meta.url)));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  const file = resolve(dist, `.${path}`, extname(path) ? "" : "index.html");
  try {
    if (!file.startsWith(`${dist}${sep}`)) throw new Error();
    const content = await readFile(file);
    res.setHeader("Content-Type", types[extname(file)] ?? "application/octet-stream");
    res.end(content);
  } catch {
    res.statusCode = 404;
    res.end(await readFile(resolve(dist, "404.html")));
  }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(resolve(tmpdir(), "marketing-hydration-"));
const chrome = spawn(process.env.CHROMIUM_BIN || "chromium", [
  "--headless", "--no-sandbox", "--disable-dev-shm-usage",
  "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });
let socket;
try {
  const endpoint = await new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error("Chromium did not start.")), 15000);
    chrome.once("error", error => { clearTimeout(timeout); reject(error); });
    chrome.stderr.on("data", data => {
      output += data;
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timeout); resolve(new URL(match[1])); }
    });
  });
  const target = await (await fetch(`http://${endpoint.host}/json/new?about:blank`, { method: "PUT" })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const errors = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown") {
      errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    }
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
      errors.push(message.params.args.map(arg => arg.value ?? arg.description).join(" "));
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  const evaluate = async expression => (await send("Runtime.evaluate", { expression, returnByValue: true })).result.value;
  const navigate = async path => {
    await send("Page.navigate", { url: `${base}${path}` });
    // Local built assets load quickly; wait until the document and hydration settle.
    for (let count = 0; count < 50; count++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (await evaluate(`location.pathname === ${JSON.stringify(path)} && document.readyState === 'complete' && !!document.querySelector('h1')`)) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return;
      }
    }
    throw new Error(`Page did not load: ${path}`);
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setScriptExecutionDisabled", { value: true });
  for (const path of ["/", "/pricing"]) {
    await navigate(path);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('h1')).opacity"), "1", path);
    assert.ok(await evaluate("document.querySelector('main').innerText.length > 500"), path);
    console.log(`${path}: main content visible without JavaScript`);
  }
  await send("Emulation.setScriptExecutionDisabled", { value: false });
  for (const path of publicPaths) {
    await navigate(path);
    assert.equal(await evaluate("document.querySelectorAll('h1').length"), 1, path);
    assert.equal(await evaluate("document.querySelectorAll('#root').length"), 1, path);
    assert.equal(errors.length, 0, `${path}: ${errors.join("\n")}`);
    console.log(`${path}: hydrated without console errors`);
  }
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate("/pricing");
  await evaluate(`document.querySelector('button[aria-label="Open menu"]').click()`);
  assert.equal(await evaluate(`document.querySelector('button[aria-label="Close menu"]').getAttribute('aria-expanded')`), "true");
  await evaluate(`[...document.querySelectorAll('a')].find(a => a.textContent.trim() === 'Product' && a.getClientRects().length).click()`);
  await new Promise(resolve => setTimeout(resolve, 500));
  assert.ok(await evaluate(`document.querySelector('h1').textContent.includes('Performance Intelligence')`));
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log("Hydrated mobile menu and client-side navigation work.");
} finally {
  socket?.close();
  chrome.kill();
  await new Promise(resolve => server.close(resolve));
  // Chromium may need a moment to release its temporary profile.
  await new Promise(resolve => setTimeout(resolve, 300));
  await rm(profile, { recursive: true, force: true, maxRetries: 3 });
}
