import { afterEach, beforeEach, expect, it, vi } from "vitest";
import request from "supertest";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import app from "../app";
import { hashContactClientIp } from "../lib/contactRateLimit";
import { sendContactDemoEmail } from "../lib/email";

vi.mock("../lib/email", () => ({ sendContactDemoEmail: vi.fn() }));

let ipCounter = 20;
let requestIps: string[] = [];

function nextIp() {
  const ip = `198.51.100.${ipCounter++}`;
  requestIps.push(ip);
  return ip;
}

const validSubmission = {
  firstName: "Casey",
  lastName: "Example",
  email: "casey@example.test",
  company: "Example Co",
  teamSize: "11-50",
  message: "Please tell me more.",
};

async function postContact(ip: string, body: Record<string, unknown> = validSubmission) {
  return request(app).post("/api/contact").set("X-Forwarded-For", ip).send(body);
}

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", "contact-rate-limit-test-session-secret-at-least-32-characters");
  vi.clearAllMocks();
  requestIps = [];
});

afterEach(async () => {
  for (const ip of requestIps) {
    await db.execute(sql`
      DELETE FROM "contact_rate_limit_buckets"
      WHERE "bucket_hash" = ${hashContactClientIp(ip)}
    `);
  }
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it("limits accepted email sends per client IP and returns a retry time", async () => {
  const ip = nextIp();
  const responses = await Promise.all(
    Array.from({ length: 12 }, () => postContact(ip)),
  );
  expect(responses.filter(response => response.status === 200)).toHaveLength(5);
  expect(responses.filter(response => response.status === 429)).toHaveLength(7);
  const limited = responses.find(response => response.status === 429)!;
  expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
  expect(sendContactDemoEmail).toHaveBeenCalledTimes(5);

  const row = await db.execute(sql`
    SELECT "request_count" FROM "contact_rate_limit_buckets"
    WHERE "bucket_hash" = ${hashContactClientIp(ip)}
  `);
  expect(Number(row.rows[0].request_count)).toBe(5);
});

it("does not charge invalid requests against the email quota and isolates client IPs", async () => {
  const ip = nextIp();
  expect((await postContact(ip, {})).status).toBe(400);
  const validResponses = await Promise.all(
    Array.from({ length: 5 }, () => postContact(ip)),
  );
  expect(validResponses.every(response => response.status === 200)).toBe(true);

  const anotherIp = nextIp();
  expect((await postContact(anotherIp)).status).toBe(200);
  expect(sendContactDemoEmail).toHaveBeenCalledTimes(6);
});

it("allows new contact requests after the hour window expires", async () => {
  const ip = nextIp();
  for (let count = 0; count < 5; count++) {
    expect((await postContact(ip)).status).toBe(200);
  }
  await db.execute(sql`
    UPDATE "contact_rate_limit_buckets"
    SET "window_started_at" = now() - interval '61 minutes'
    WHERE "bucket_hash" = ${hashContactClientIp(ip)}
  `);
  expect((await postContact(ip)).status).toBe(200);
  expect(sendContactDemoEmail).toHaveBeenCalledTimes(6);
});

it("fails closed when the shared rate-limit store is unavailable", async () => {
  const ip = nextIp();
  vi.spyOn(db, "execute").mockRejectedValueOnce(new Error("database unavailable"));
  const response = await postContact(ip);
  expect(response.status).toBe(503);
  expect(response.body.error).toMatch(/temporarily unavailable/i);
  expect(sendContactDemoEmail).not.toHaveBeenCalled();
});
