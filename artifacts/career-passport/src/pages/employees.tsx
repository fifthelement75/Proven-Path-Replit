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
import { getApiUrl } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const LEVELS = ["Junior", "Mid", "Senior", "Lead", "Manager", "Director"];
const DEPARTMENTS = ["Engineering", "Product", "Design", "Marketing", "Sales", "Operations", "HR", "Finance"];

interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  level: string;
  startDate: string;
  managerId: number | null;
  managerName: string | null;
  latestScore: number | null;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <Badge variant="secondary" className="text-xs">No reviews</Badge>;
  const color = score >= 4 ? "text-green-700 bg-green-50 border-green-200" : score >= 3 ? "text-yellow-700 bg-yellow-50 border-yellow-200" : "text-red-700 bg-red-50 border-red-200";
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${color}`}>{score.toFixed(1)}</span>;
}

function AddEmployeeDialog({
  open,
  onClose,
  employees,
}: {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "", email: "", role: "", department: "", level: "Mid", startDate: new Date().toISOString().split("T")[0], managerId: "none", userRole: "employee",
  });
  const [error, setError] = useState("");
  const [nameSuggestions, setNameSuggestions] = useState<Employee[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  interface CreateEmployeeInput {
    name: string;
    email: string;
    role: string;
    department: string;
    level: string;
    startDate: string;
    managerId: number | null;
    userRole: "admin" | "manager" | "employee";
  }

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: CreateEmployeeInput) => {
      const res = await fetch(getApiUrl("/employees"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create employee");
      }
      return res.json();
    },
    onSuccess: (data: { name: string; emailSent?: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["health"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      onClose();
      setForm({ name: "", email: "", role: "", department: "", level: "Mid", startDate: new Date().toISOString().split("T")[0], managerId: "", userRole: "employee" });
      setError("");
      if (data?.emailSent) {
        toast({ title: "Employee added", description: `A login invite was emailed to ${data.name || "the new employee"}.` });
      } else {
        toast({ title: "Employee added", description: "We couldn't send the login invite email. You can re-add or contact them directly.", variant: "destructive" });
      }
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleClose() {
    setForm({ name: "", email: "", role: "", department: "", level: "Mid", startDate: new Date().toISOString().split("T")[0], managerId: "", userRole: "employee" });
    setError("");
    setShowSuggestions(false);
    setNameSuggestions([]);
    onClose();
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setForm(f => ({ ...f, name: value }));
    if (value.trim().length >= 1) {
      const matches = employees.filter(emp =>
        emp.name.toLowerCase().includes(value.toLowerCase())
      );
      setNameSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }

  function selectSuggestedEmployee(emp: Employee) {
    setForm(f => ({ ...f, name: emp.name, email: emp.email }));
    setShowSuggestions(false);
    setNameSuggestions([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    mutate({
      name: form.name,
      email: form.email,
      role: form.role,
      department: form.department,
      level: form.level,
      startDate: form.startDate,
      managerId: (form.managerId && form.managerId !== "none") ? parseInt(form.managerId) : null,
      userRole: form.userRole as "admin" | "manager" | "employee",
    });
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2 relative">
              <Label>Full name</Label>
              <Input
                value={form.name}
                onChange={handleNameChange}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                required
                placeholder="Jane Smith"
                autoComplete="off"
              />
              {showSuggestions && (
                <div className="absolute z-50 w-full bg-white border rounded-md shadow-lg mt-0.5 max-h-44 overflow-auto">
                  {nameSuggestions.map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors text-sm"
                      onMouseDown={() => selectSuggestedEmployee(emp)}
                    >
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-xs text-muted-foreground">{emp.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="jane@company.com" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Role / Title</Label>
              <Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} required placeholder="Senior Software Engineer" />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Select value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Manager (optional)</Label>
              <Select value={form.managerId} onValueChange={v => setForm(f => ({ ...f, managerId: v }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {employees.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Access role</Label>
              <Select value={form.userRole} onValueChange={v => setForm(f => ({ ...f, userRole: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{INVITE_ROLES.find(r => r.value === form.userRole)?.hint}</p>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Adding..." : "Add employee"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const INVITE_ROLES = [
  { value: "employee", label: "Team Member", hint: "Can view and manage their own profile only." },
  { value: "manager", label: "Manager", hint: "Can review and manage their direct reports." },
  { value: "admin", label: "Administrator", hint: "Full access to the whole organization." },
];

export default function EmployeesPage() {
  const { user } = useAuthContext();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [level, setLevel] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/employees"), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load employees");
      return res.json();
    },
  });

  const filtered = employees.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase());
    const matchDept = department === "all" || e.department === department;
    const matchLevel = level === "all" || e.level === level;
    return matchSearch && matchDept && matchLevel;
  });

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between" data-onboarding="employees-header">
          <div>
            <h1 className="text-2xl font-bold">Employees</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{employees.length} total</p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button onClick={() => setAddOpen(true)} data-onboarding="add-employee-btn">Add employee</Button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              {LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          {(search || department !== "all" || level !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setDepartment("all"); setLevel("all"); }}>
              Clear
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {employees.length === 0 ? "No employees yet. Add your first employee." : "No employees match your filters."}
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-[#fffffff5]" data-onboarding="employees-table">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Department</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Level</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Manager</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(emp => (
                  <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/employees/${emp.id}`}>
                        <div>
                          <div className="font-medium hover:text-primary cursor-pointer">{emp.name}</div>
                          <div className="text-xs text-muted-foreground">{emp.email}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{emp.role}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs">{emp.department}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">{emp.level}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">{emp.managerName || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <ScoreBadge score={emp.latestScore} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {isAdmin && <AddEmployeeDialog open={addOpen} onClose={() => setAddOpen(false)} employees={employees} />}
    </Layout>
  );
}
