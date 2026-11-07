import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { randomUUID } from "node:crypto";
import {
  db, companiesTable, employeesTable, devPlansTable, devPlanSkillsTable,
  feedbackTable, integrationConnectionsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken } from "../middlewares/auth";
import companiesRouter from "./companies";
import devPlanRouter from "./devplan";
import feedbackRouter from "./feedback";
import integrationsRouter from "./integrations";
import { openai } from "@workspace/integrations-openai-ai-server";

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
}));

const app = express();
app.use(express.json());
app.use(companiesRouter);
app.use(devPlanRouter);
app.use(feedbackRouter);
app.use(integrationsRouter);

let companyId: number;
let adminToken: string;
let managerToken: string;
let employeeToken: string;
let reportToken: string;
let unrelatedEmployeeToken: string;
let managerId: number;
let employeeId: number;
let reportId: number;
let unrelatedEmployeeId: number;
let employeeSkillId: number;
let reportSkillId: number;
let ownFeedbackId: number;
let reportFeedbackId: number;

async function addEmployee(name: string, userRole: string, managerId?: number) {
  const [employee] = await db.insert(employeesTable).values({
    companyId,
    name,
    email: `${name.toLowerCase().replaceAll(" ", ".")}+${randomUUID()}@example.test`,
    role: "Analyst",
    department: "Operations",
    level: "L2",
    startDate: "2025-01-01",
    userRole,
    managerId: managerId ?? null,
  }).returning();
  return employee;
}

async function addPlan(targetEmployeeId: number) {
  const [plan] = await db.insert(devPlansTable).values({
    employeeId: targetEmployeeId,
    summary: "Private plan summary",
  }).returning();
  const [skill] = await db.insert(devPlanSkillsTable).values({
    devPlanId: plan.id,
    skillName: "Planning",
    description: "Improve planning skills.",
  }).returning();
  return { planId: plan.id, skillId: skill.id };
}

function createEmployeeToken(employee: { id: number; email: string; userRole: string }) {
  return signToken({
    companyId, userId: employee.id, email: employee.email,
    role: employee.userRole, employeeId: employee.id,
  });
}

beforeAll(async () => {
  const [company] = await db.insert(companiesTable).values({
    name: "Tenant access test",
    email: `__tenant_access_${randomUUID()}@example.test`,
    passwordHash: "test-only",
    complimentaryTeamAccess: true,
    plan: "team",
  }).returning();
  companyId = company.id;
  adminToken = signToken({
    companyId, userId: company.id, email: company.email,
    role: "admin", employeeId: null,
  });

  const manager = await addEmployee("Test Manager", "manager");
  const employee = await addEmployee("Test Employee", "employee");
  const report = await addEmployee("Direct Report", "employee", manager.id);
  const unrelated = await addEmployee("Unrelated Employee", "employee");
  managerId = manager.id;
  employeeId = employee.id;
  reportId = report.id;
  unrelatedEmployeeId = unrelated.id;
  managerToken = createEmployeeToken(manager);
  employeeToken = createEmployeeToken(employee);
  reportToken = createEmployeeToken(report);
  unrelatedEmployeeToken = createEmployeeToken(unrelated);

  ({ skillId: employeeSkillId } = await addPlan(employeeId));
  ({ skillId: reportSkillId } = await addPlan(reportId));
  await addPlan(unrelatedEmployeeId);

  const [ownFeedback] = await db.insert(feedbackTable).values({
    employeeId, meetingType: "one_on_one", meetingDate: "2025-03-01",
    whatWentWell: "Private note for the employee.",
  }).returning();
  const [reportFeedback] = await db.insert(feedbackTable).values({
    employeeId: reportId, managerId, meetingType: "one_on_one",
    meetingDate: "2025-03-02", whatWentWell: "Private note for the report.",
  }).returning();
  ownFeedbackId = ownFeedback.id;
  reportFeedbackId = reportFeedback.id;

  await db.insert(integrationConnectionsTable).values({
    companyId, category: "hris", provider: "workday", accountLabel: "Private HR workspace",
  });
});

afterAll(async () => {
  if (companyId) {
    await db.delete(integrationConnectionsTable).where(eq(integrationConnectionsTable.companyId, companyId));
    await db.delete(companiesTable).where(eq(companiesTable.id, companyId));
  }
});

describe("company-wide analytics and integration inventory", () => {
  it("restricts organization-wide summaries to admins while preserving admin access", async () => {
    for (const path of [
      "/companies/me/health",
      "/companies/me/activity",
      "/companies/me/employee-summaries",
    ]) {
      expect((await request(app).get(path).auth(employeeToken, { type: "bearer" })).status).toBe(403);
      expect((await request(app).get(path).auth(managerToken, { type: "bearer" })).status).toBe(403);
      expect((await request(app).get(path).auth(adminToken, { type: "bearer" })).status).toBe(200);
    }
  });

  it("restricts integration inventory to admins", async () => {
    expect((await request(app).get("/integrations").auth(employeeToken, { type: "bearer" })).status).toBe(403);
    expect((await request(app).get("/integrations").auth(managerToken, { type: "bearer" })).status).toBe(403);
    const admin = await request(app).get("/integrations").auth(adminToken, { type: "bearer" });
    expect(admin.status).toBe(200);
    expect(admin.body.connections[0]).toMatchObject({
      provider: "workday", accountLabel: "Private HR workspace",
    });
  });
});

describe("development-plan object access", () => {
  it("allows self, admin, and direct-manager access but blocks other employees", async () => {
    const own = await request(app).get(`/employees/${employeeId}/dev-plan`)
      .auth(employeeToken, { type: "bearer" });
    expect(own.status).toBe(200);
    expect(own.body.summary).toBe("Private plan summary");

    expect((await request(app).get(`/employees/${reportId}/dev-plan`)
      .auth(employeeToken, { type: "bearer" })).status).toBe(403);
    expect((await request(app).get(`/employees/${reportId}/dev-plan`)
      .auth(managerToken, { type: "bearer" })).status).toBe(200);
    expect((await request(app).get(`/employees/${unrelatedEmployeeId}/dev-plan`)
      .auth(managerToken, { type: "bearer" })).status).toBe(403);
    expect((await request(app).get(`/employees/${unrelatedEmployeeId}/dev-plan`)
      .auth(adminToken, { type: "bearer" })).status).toBe(200);
  });

  it("lets employees update only their own skills and prevents unauthorized plan regeneration", async () => {
    const ownUpdate = await request(app).patch(`/employees/${employeeId}/dev-plan/skills/${employeeSkillId}/complete`)
      .auth(employeeToken, { type: "bearer" }).send({ completed: true });
    expect(ownUpdate.status).toBe(200);
    expect(ownUpdate.body.completed).toBe(true);

    expect((await request(app).patch(`/employees/${reportId}/dev-plan/skills/${reportSkillId}/complete`)
      .auth(employeeToken, { type: "bearer" }).send({ completed: true })).status).toBe(403);
    expect((await db.select().from(devPlanSkillsTable).where(eq(devPlanSkillsTable.id, reportSkillId)))[0].completed).toBe(false);

    vi.mocked(openai.chat.completions.create).mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            summary: "Generated for an authorized manager.",
            skills: [{
              skillName: "Communication", priority: 1, description: "Improve clarity.",
              resources: "", timeline: "3 months", nextSteps: "Practice weekly.",
            }],
          }),
        },
      }],
    } as never);
    expect((await request(app).post(`/employees/${reportId}/dev-plan/generate`)
      .auth(employeeToken, { type: "bearer" }).send({})).status).toBe(403);
    expect(openai.chat.completions.create).not.toHaveBeenCalled();

    const generated = await request(app).post(`/employees/${reportId}/dev-plan/generate`)
      .auth(managerToken, { type: "bearer" }).send({});
    expect(generated.status).toBe(200);
    expect(generated.body.summary).toBe("Generated for an authorized manager.");
    expect(vi.mocked(openai.chat.completions.create)).toHaveBeenCalledTimes(1);
  });
});

describe("feedback object access", () => {
  it("limits reading feedback to self, admins, and direct managers", async () => {
    expect((await request(app).get(`/employees/${employeeId}/feedback`)
      .auth(employeeToken, { type: "bearer" })).status).toBe(200);
    expect((await request(app).get(`/employees/${reportId}/feedback`)
      .auth(employeeToken, { type: "bearer" })).status).toBe(403);
    expect((await request(app).get(`/employees/${reportId}/feedback`)
      .auth(managerToken, { type: "bearer" })).status).toBe(200);
    expect((await request(app).get(`/employees/${unrelatedEmployeeId}/feedback`)
      .auth(managerToken, { type: "bearer" })).status).toBe(403);
    expect((await request(app).get(`/employees/${reportId}/feedback`)
      .auth(adminToken, { type: "bearer" })).status).toBe(200);
  });

  it("allows managers to create feedback only for authorized employees", async () => {
    const body = { meetingType: "one_on_one", meetingDate: "2025-03-03", whatWentWell: "Test note." };
    expect((await request(app).post(`/employees/${reportId}/feedback`)
      .auth(employeeToken, { type: "bearer" }).send(body)).status).toBe(403);
    expect((await request(app).post(`/employees/${reportId}/feedback`)
      .auth(managerToken, { type: "bearer" }).send(body)).status).toBe(201);
    expect((await request(app).post(`/employees/${unrelatedEmployeeId}/feedback`)
      .auth(managerToken, { type: "bearer" }).send(body)).status).toBe(403);
  });

  it("allows only the target employee to write an employee response", async () => {
    const responseBody = { employeeResponse: "I acknowledge this feedback." };
    expect((await request(app).post(`/employees/${reportId}/feedback/${reportFeedbackId}/respond`)
      .auth(employeeToken, { type: "bearer" }).send(responseBody)).status).toBe(403);
    expect((await request(app).post(`/employees/${reportId}/feedback/${reportFeedbackId}/respond`)
      .auth(managerToken, { type: "bearer" }).send(responseBody)).status).toBe(403);
    const own = await request(app).post(`/employees/${employeeId}/feedback/${ownFeedbackId}/respond`)
      .auth(employeeToken, { type: "bearer" }).send(responseBody);
    expect(own.status).toBe(200);
    expect(own.body.employeeResponse).toBe(responseBody.employeeResponse);
  });
});
