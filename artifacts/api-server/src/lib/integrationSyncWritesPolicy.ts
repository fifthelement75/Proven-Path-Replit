import { IntegrationError } from "./pipedreamConnect";
import type { SyncConfig } from "./integrationSyncPolicy";

// Verified against the Pipedream component implementations:
// components/bamboohr/actions/update-employee/update-employee.mjs updates the
// specified employee; components/workday/actions/change-business-title/
// change-business-title.mjs changes the specified worker's title.
// Create/append actions belong exclusively to manually confirmed Data exchange.
export const AUTOMATIC_UPDATES: Record<string, {
  provider: string; target: string; fields: Record<string, string>;
}> = {
  "bamboohr-update-employee": {
    provider: "bamboohr", target: "employeeId",
    fields: { jobTitle: "role", department: "department", workEmail: "email", hireDate: "startDate" },
  },
  "workday-change-business-title": {
    provider: "workday", target: "workerId", fields: { proposedBusinessTitle: "role" },
  },
};

export function assertAutomaticUpdate(provider: string, outbound: NonNullable<SyncConfig["outbound"]>) {
  const capability = AUTOMATIC_UPDATES[outbound.actionKey];
  if (!capability || capability.provider !== provider) {
    throw new IntegrationError(400, "This operation is not a verified record update. Create and append operations require manually confirmed Data exchange.");
  }
  if (outbound.fields[capability.target] !== "remoteId") {
    throw new IntegrationError(400, `Map ${capability.target} to the stable remoteId before approving automatic updates.`);
  }
  // These verified update operations require no static routing properties.
  if (Object.keys(outbound.props).length) throw new IntegrationError(400, "Static fields are not supported for this automatic update.");
  const changes = Object.entries(outbound.fields).filter(([prop]) => prop !== capability.target);
  if (!changes.length || changes.some(([prop, field]) => capability.fields[prop] !== field)) {
    throw new IntegrationError(400, "Map only the verified provider update fields to their corresponding locally owned fields.");
  }
}
