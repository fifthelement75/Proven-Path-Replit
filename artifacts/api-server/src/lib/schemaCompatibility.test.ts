import { describe, expect, it } from "vitest";
import {
  CreateEmployeeBody,
  GetEmployeeParams,
  LoginBody,
  MarkSkillCompleteBody,
  UpdateEmployeeBody,
} from "@workspace/api-zod";
import { insertEmployeeSchema } from "../../../../lib/db/src/schema/employees";

const employee = {
  name: "Test Employee",
  email: "employee@example.test",
  role: "Developer",
  department: "Engineering",
  level: "Senior",
  startDate: "2026-01-01",
};

describe("schema compatibility after the Zod security upgrade", () => {
  it("preserves valid login input and strips unknown properties", () => {
    expect(LoginBody.parse({
      email: "employee@example.test", password: "test", extra: true,
    })).toEqual({ email: "employee@example.test", password: "test" });
  });

  it("reports invalid request fields through issues", () => {
    const result = LoginBody.safeParse({ email: 42 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0]))
        .toEqual(expect.arrayContaining(["email", "password"]));
    }
  });

  it("coerces numeric route parameters and rejects invalid numbers", () => {
    expect(GetEmployeeParams.parse({ id: "42" })).toEqual({ id: 42 });
    expect(GetEmployeeParams.safeParse({ id: "invalid" }).success).toBe(false);
  });

  it("preserves omitted and nullable manager fields and role enums", () => {
    expect(CreateEmployeeBody.parse(employee)).toEqual(employee);
    expect(CreateEmployeeBody.parse({ ...employee, managerId: null }).managerId).toBeNull();
    expect(CreateEmployeeBody.safeParse({ ...employee, userRole: "owner" }).success).toBe(false);
    expect(UpdateEmployeeBody.parse({})).toEqual({});
  });

  it("does not coerce completion strings to booleans", () => {
    expect(MarkSkillCompleteBody.parse({ completed: false })).toEqual({ completed: false });
    expect(MarkSkillCompleteBody.safeParse({ completed: "false" }).success).toBe(false);
  });

  it("supports drizzle-generated database insert schemas", () => {
    expect(insertEmployeeSchema.parse({ ...employee, companyId: 1 }))
      .toEqual({ ...employee, companyId: 1 });
    expect(insertEmployeeSchema.safeParse({ ...employee, companyId: "invalid" }).success).toBe(false);
  });
});
