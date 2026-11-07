import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildOrgForest, OrgChart, type OrgChartMember } from "./org-chart";

function member(id: number, managerId: number | null = null): OrgChartMember {
  return {
    id, managerId, name: `Person ${id}`, email: `person${id}@example.test`,
    userRole: id === 1 ? "admin" : id === 2 ? "manager" : "employee",
    managerName: managerId ? `Person ${managerId}` : null,
  };
}

afterEach(cleanup);

describe("organization chart", () => {
  it("renders names and role badges in nested manager/direct-report lists", () => {
    render(<OrgChart members={[member(3, 2), member(1), member(2, 1), member(4, 1)]} />);
    const direct = screen.getByRole("list", { name: "Direct reports of Person 1" });
    expect(within(direct).getByTestId("org-node-2")).toBeTruthy();
    expect(within(direct).getByTestId("org-node-4")).toBeTruthy();
    expect(within(screen.getByRole("list", { name: "Direct reports of Person 2" })).getByText("Person 3")).toBeTruthy();
    expect(screen.getByTestId("badge-org-role-1").textContent).toBe("Administrator");
    expect(screen.getByTestId("badge-org-role-2").textContent).toBe("Manager");
    expect(screen.getByTestId("badge-org-role-3").textContent).toBe("Team Member");
    expect(screen.getByTestId("org-chart").tabIndex).toBe(0);
  });

  it("retains separate roots, missing managers and self references", () => {
    const forest = buildOrgForest([member(1), member(2), member(3, 999), member(4, 4)]);
    expect(forest.map(n => [n.member.id, n.rootReason])).toEqual([
      [1, "none"], [2, "none"], [3, "missing"], [4, "self"],
    ]);
    render(<OrgChart members={[member(1), member(3, 999), member(4, 4)]} />);
    expect(screen.getByText("Manager not found")).toBeTruthy();
    expect(screen.getByText("Reports to self")).toBeTruthy();
  });

  it("breaks cycles at a cycle member while retaining descendants exactly once", () => {
    const members = [member(3, 2), member(2, 1), member(1, 2), member(4, 3)];
    const forest = buildOrgForest(members);
    expect(forest).toHaveLength(1);
    expect(forest[0].member.id).not.toBe(3);
    expect(forest[0].rootReason).toBe("cycle");
    render(<OrgChart members={members} />);
    for (const m of members) expect(screen.getAllByTestId(`org-node-${m.id}`)).toHaveLength(1);
    expect(screen.getAllByText("Circular reporting")).toHaveLength(1);
  });

  it("handles empty and one-person organizations", () => {
    const view = render(<OrgChart members={[]} />);
    expect(screen.getByText("No people to chart yet.")).toBeTruthy();
    view.rerender(<OrgChart members={[member(1)]} />);
    expect(screen.getByTestId("org-node-1")).toBeTruthy();
  });

  it("builds deep and wide organizations without losing members", () => {
    const deep = buildOrgForest(Array.from({ length: 1500 }, (_, i) => member(i + 1, i ? i : null)));
    let count = 0;
    let node = deep[0];
    while (node) { count++; node = node.children[0]; }
    expect(count).toBe(1500);
    const wide = buildOrgForest([member(1), ...Array.from({ length: 100 }, (_, i) => member(i + 2, 1))]);
    expect(wide[0].children).toHaveLength(100);
  });
});
