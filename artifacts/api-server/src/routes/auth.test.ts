import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import bcrypt from "bcryptjs";
import { db, companiesTable, employeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import authRouter from "./auth";

const app = express();
app.use(express.json());
app.use(authRouter);

const stamp = Date.now();
const adminEmail = `__test_auth_admin_${stamp}@example.com`;
const employeeEmail = `__test_auth_emp_${stamp}@example.com`;
const password = "s3cure-Passw0rd!";

let companyId: number;

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(password, 10);
  const [company] = await db.insert(companiesTable).values({
    name: `__test_auth_co_${stamp}`,
    email: adminEmail,
    passwordHash,
  } as typeof companiesTable.$inferInsert).returning();
  companyId = company.id;

  await db.insert(employeesTable).values({
    companyId,
    name: "Auth Test Employee",
    email: employeeEmail,
    role: "Engineer",
    department: "Engineering",
    level: "senior",
    startDate: "2024-01-01",
    userRole: "employee",
    passwordHash,
  } as typeof employeesTable.$inferInsert);
});

afterAll(async () => {
  await db.delete(employeesTable).where(eq(employeesTable.companyId, companyId));
  await db.delete(companiesTable).where(eq(companiesTable.id, companyId));
  // Clean up any company created by the register test
  await db.delete(companiesTable).where(eq(companiesTable.email, `__test_auth_reg_${stamp}@example.com`));
});

describe("POST /auth/login", () => {
  it("logs in a company admin with valid credentials", async () => {
    const res = await request(app).post("/auth/login").send({ email: adminEmail, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ email: adminEmail, role: "admin", companyId });
  });

  it("logs in an employee with valid credentials", async () => {
    const res = await request(app).post("/auth/login").send({ email: employeeEmail, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ email: employeeEmail, role: "employee", companyId });
  });

  it("rejects a wrong password and an unknown email with 401", async () => {
    const wrongPw = await request(app).post("/auth/login").send({ email: adminEmail, password: "wrong-password" });
    expect(wrongPw.status).toBe(401);

    const unknown = await request(app).post("/auth/login").send({ email: `nobody_${stamp}@example.com`, password });
    expect(unknown.status).toBe(401);
  });

  it("rejects a malformed body with 400", async () => {
    const res = await request(app).post("/auth/login").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
  });
});

describe("POST /auth/register", () => {
  it("registers a new company and returns a token", async () => {
    const res = await request(app).post("/auth/register").send({
      companyName: `__test_auth_reg_co_${stamp}`,
      email: `__test_auth_reg_${stamp}@example.com`,
      password,
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe("admin");
  });

  it("rejects a duplicate email with 409", async () => {
    const res = await request(app).post("/auth/register").send({
      companyName: `__test_auth_dupe_co_${stamp}`,
      email: adminEmail,
      password,
    });
    expect(res.status).toBe(409);
  });

  it("rejects a duplicate organization name with 409", async () => {
    const res = await request(app).post("/auth/register").send({
      companyName: `__test_auth_co_${stamp}`,
      email: `__test_auth_other_${stamp}@example.com`,
      password,
    });
    expect(res.status).toBe(409);
  });
});
