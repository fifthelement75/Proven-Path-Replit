import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";

export interface OrgChartMember {
  id: number;
  name: string;
  email: string;
  userRole: string;
  managerId: number | null;
  managerName: string | null;
}

export type OrgRootReason = "none" | "missing" | "self" | "cycle";

export interface OrgNode {
  member: OrgChartMember;
  children: OrgNode[];
  rootReason?: OrgRootReason;
}

const ACCESS_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Manager",
  employee: "Team Member",
};

function accessBadgeClass(role: string): string {
  if (role === "admin") return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (role === "manager") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-muted text-muted-foreground";
}

const ROOT_NOTES: Record<OrgRootReason, string | null> = {
  none: null,
  missing: "Manager not found",
  self: "Reports to self",
  cycle: "Circular reporting",
};

/**
 * Builds a forest without recursion. Every member appears exactly once.
 * Members whose manager is absent, themselves, or part of a cycle become roots.
 */
export function buildOrgForest(members: OrgChartMember[]): OrgNode[] {
  const byId = new Map<number, OrgChartMember>();
  for (const m of members) if (!byId.has(m.id)) byId.set(m.id, m);
  const unique = Array.from(byId.values());

  const childIds = new Map<number, number[]>();
  const roots: { id: number; reason: OrgRootReason }[] = [];
  for (const m of unique) {
    if (m.managerId == null) roots.push({ id: m.id, reason: "none" });
    else if (m.managerId === m.id) roots.push({ id: m.id, reason: "self" });
    else if (!byId.has(m.managerId)) roots.push({ id: m.id, reason: "missing" });
    else {
      const list = childIds.get(m.managerId) ?? [];
      list.push(m.id);
      childIds.set(m.managerId, list);
    }
  }

  const nodes = new Map<number, OrgNode>();
  const visited = new Set<number>();
  const forest: OrgNode[] = [];

  const expand = (rootId: number, reason: OrgRootReason) => {
    const root: OrgNode = { member: byId.get(rootId)!, children: [], rootReason: reason };
    nodes.set(rootId, root);
    visited.add(rootId);
    forest.push(root);
    const queue = [rootId];
    for (let index = 0; index < queue.length; index++) {
      const id = queue[index];
      const parent = nodes.get(id)!;
      for (const cid of childIds.get(id) ?? []) {
        if (visited.has(cid)) continue;
        visited.add(cid);
        const node: OrgNode = { member: byId.get(cid)!, children: [] };
        nodes.set(cid, node);
        parent.children.push(node);
        queue.push(cid);
      }
    }
  };

  for (const r of roots) expand(r.id, r.reason);
  // Start at the actual cycle, not a descendant encountered earlier in API order.
  for (const m of unique) {
    if (visited.has(m.id)) continue;
    const path = new Set<number>();
    let id = m.id;
    while (!path.has(id)) {
      path.add(id);
      id = byId.get(id)!.managerId!;
    }
    expand(id, "cycle");
  }
  return forest;
}

function NodeCard({ node, level }: { node: OrgNode; level: number }) {
  const { member, children, rootReason } = node;
  const roleLabel = ACCESS_LABELS[member.userRole] || member.userRole;
  const note = rootReason ? ROOT_NOTES[rootReason] : null;
  const initials = member.name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "?";
  const description = [
    roleLabel,
    level > 1 && member.managerName ? `reports to ${member.managerName}` : null,
    note,
    children.length ? `${children.length} direct report${children.length === 1 ? "" : "s"}` : null,
  ].filter(Boolean).join(", ");

  return (
    <div
      tabIndex={0}
      data-testid={`org-node-${member.id}`}
      aria-label={`${member.name}, ${description}`}
      title={`${member.name} · ${member.email}`}
      className="org-node group relative z-[1] flex w-[184px] items-center gap-2 rounded-lg border bg-card px-2.5 py-2 text-left shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${children.length ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
        {initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-foreground" data-testid={`text-org-name-${member.id}`}>{member.name}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1">
          <Badge variant="outline" className={`px-1.5 py-0 text-[10px] ${accessBadgeClass(member.userRole)}`} data-testid={`badge-org-role-${member.id}`}>
            {roleLabel}
          </Badge>
          {children.length > 0 && (
            <span className="text-[10px] tabular-nums text-muted-foreground" aria-hidden="true">{children.length} reports</span>
          )}
        </span>
        {note && (
          <span className="mt-0.5 block text-[10px] font-medium text-amber-700" data-testid={`status-org-note-${member.id}`}>{note}</span>
        )}
      </span>
    </div>
  );
}

function Branch({ node, level }: { node: OrgNode; level: number }) {
  return (
    <li className="org-li" data-testid={`org-item-${node.member.id}`}>
      <NodeCard node={node} level={level} />
      {node.children.length > 0 && (
        <ul className="org-ul" aria-label={`Direct reports of ${node.member.name}`}>
          {node.children.map(c => <Branch key={c.member.id} node={c} level={level + 1} />)}
        </ul>
      )}
    </li>
  );
}

export function OrgChart({ members }: { members: OrgChartMember[] }) {
  const forest = useMemo(() => buildOrgForest(members), [members]);
  if (forest.length === 0) {
    return <p className="text-xs text-muted-foreground" data-testid="text-org-empty">No people to chart yet.</p>;
  }
  return (
    <div
      className="org-scroll -mx-3 max-h-[32rem] overflow-auto overscroll-contain px-3 pb-2"
      tabIndex={0}
      role="region"
      aria-label="Organization chart, scroll horizontally to see more"
      data-testid="org-chart"
    >
      <ul className="org-ul org-root mx-auto w-max" aria-label="Organization chart">
        {forest.map(n => <Branch key={n.member.id} node={n} level={1} />)}
      </ul>
    </div>
  );
}
