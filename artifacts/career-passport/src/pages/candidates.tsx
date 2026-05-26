import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getApiUrl } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { ROLE_TEMPLATES, CANDIDATE_STATUSES, CANDIDATE_SOURCES } from "@/data/roleTemplates";

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

interface Candidate {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  roleApplyingFor: string;
  levelApplyingFor: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  assessmentCount: number;
  createdAt: string;
}

function statusInfo(status: string) {
  return CANDIDATE_STATUSES.find(s => s.value === status) ?? { label: status, color: "bg-gray-100 text-gray-700" };
}

function AddCandidateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    roleApplyingFor: "", levelApplyingFor: "",
    source: "", notes: "",
  });
  const [error, setError] = useState("");

  const selectedRole = ROLE_TEMPLATES.find(r => r.role === form.roleApplyingFor);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl("/candidates"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      setForm({ name: "", email: "", phone: "", roleApplyingFor: "", levelApplyingFor: "", source: "", notes: "" });
      setError("");
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Candidate</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</p>}
          <div className="space-y-1.5">
            <Label>Full name <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555 0100" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role <span className="text-destructive">*</span></Label>
              <Select value={form.roleApplyingFor} onValueChange={v => setForm(f => ({ ...f, roleApplyingFor: v, levelApplyingFor: "" }))}>
                <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                <SelectContent>
                  {ROLE_TEMPLATES.map(r => <SelectItem key={r.role} value={r.role}>{r.roleLabel}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Select value={form.levelApplyingFor} onValueChange={v => setForm(f => ({ ...f, levelApplyingFor: v }))} disabled={!selectedRole}>
                <SelectTrigger><SelectValue placeholder="Select level..." /></SelectTrigger>
                <SelectContent>
                  {selectedRole?.levels.map(l => <SelectItem key={l.level} value={l.level}>{l.levelLabel}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
              <SelectTrigger><SelectValue placeholder="How did they apply?" /></SelectTrigger>
              <SelectContent>
                {CANDIDATE_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Any initial notes about this candidate..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutate()} disabled={isPending || !form.name || !form.roleApplyingFor}>
            {isPending ? "Adding..." : "Add candidate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CandidatesPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const { data: candidates = [], isLoading } = useQuery<Candidate[]>({
    queryKey: ["candidates"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/candidates"), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const filtered = candidates.filter(c => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      c.roleApplyingFor.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchRole = roleFilter === "all" || c.roleApplyingFor === roleFilter;
    return matchSearch && matchStatus && matchRole;
  });

  const statusCounts = CANDIDATE_STATUSES.map(s => ({
    ...s,
    count: candidates.filter(c => c.status === s.value).length,
  }));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between" data-onboarding="candidates-header">
          <div>
            <h1 className="text-2xl font-bold">Interview Pipeline</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{candidates.length} candidate{candidates.length !== 1 ? "s" : ""} tracked</p>
          </div>
          <Button onClick={() => setAddOpen(true)}>Add candidate</Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statusCounts.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(statusFilter === s.value ? "all" : s.value)}
              className="p-3 rounded-lg border text-left transition-all hover:shadow-sm bg-[#ffffffff]"
            >
              <div className="text-2xl font-bold">{s.count}</div>
              <div className={`text-xs font-medium mt-1 px-1.5 py-0.5 rounded inline-block ${s.color}`}>{s.label}</div>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search candidates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="sm:w-64"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLE_TEMPLATES.map(r => <SelectItem key={r.role} value={r.role}>{r.roleLabel}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {CANDIDATE_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {candidates.length === 0
                ? "No candidates yet. Add your first candidate to start tracking interviews."
                : "No candidates match your filters."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(c => {
              const roleLabel = ROLE_TEMPLATES.find(r => r.role === c.roleApplyingFor)?.roleLabel ?? c.roleApplyingFor;
              const levelLabel = ROLE_TEMPLATES.find(r => r.role === c.roleApplyingFor)?.levels.find(l => l.level === c.levelApplyingFor)?.levelLabel;
              const si = statusInfo(c.status);
              return (
                <Link key={c.id} href={`/candidates/${c.id}`}>
                  <Card className="cursor-pointer hover:shadow-sm transition-shadow">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm">{c.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {roleLabel}{levelLabel ? ` · ${levelLabel}` : ""}
                              {c.email ? ` · ${c.email}` : ""}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {c.source && <span className="text-xs text-muted-foreground hidden sm:block">{c.source}</span>}
                          <Badge className={`text-xs ${si.color}`}>{si.label}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {c.assessmentCount} assessment{c.assessmentCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <AddCandidateDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </Layout>
  );
}
