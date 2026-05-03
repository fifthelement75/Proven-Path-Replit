import { useEffect, useRef, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/api";
import { getToken, setUser as persistUser, type User } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, LogOut, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_PHOTO_BYTES = 1_500_000;

function getInitials(name?: string | null, email?: string | null): string {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { user, login, logout } = useAuthContext();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === "admin";
  const [name, setName] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [department, setDepartment] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoDirty, setPhotoDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setName(user.name ?? user.companyName ?? "");
    setJobRole(user.jobRole ?? "");
    setDepartment(user.department ?? "");
    setPhotoUrl(user.profilePhotoUrl ?? null);
    setPhotoDirty(false);
  }, [open, user]);

  if (!user) return null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please choose an image file.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast({ title: "Image too large", description: "Please choose an image under 1.5MB.", variant: "destructive" });
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setPhotoUrl(dataUrl);
      setPhotoDirty(true);
    } catch {
      toast({ title: "Couldn't read image", variant: "destructive" });
    }
  }

  function handleRemovePhoto() {
    setPhotoUrl(null);
    setPhotoDirty(true);
  }

  async function handleSave() {
    if (!user) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { name: trimmedName };
      if (photoDirty) payload.profilePhotoUrl = photoUrl;
      if (!isAdmin) {
        if (jobRole.trim()) payload.jobRole = jobRole.trim();
        if (department.trim()) payload.department = department.trim();
      }
      const token = getToken();
      const res = await fetch(getApiUrl("/auth/me"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update profile");
      }
      const updated: User = await res.json();
      persistUser(updated);
      login(token!, updated);
      toast({ title: "Profile updated" });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleSignOut() {
    onOpenChange(false);
    logout();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Profile settings</DialogTitle>
          <DialogDescription>
            Update your photo and account information.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            {photoUrl ? <AvatarImage src={photoUrl} alt={name || user.email} /> : null}
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {getInitials(name, user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Camera className="h-4 w-4" />
              {photoUrl ? "Change photo" : "Upload photo"}
            </Button>
            {photoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemovePhoto}
                className="gap-2 text-muted-foreground hover:text-destructive justify-start px-2"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="profile-name">{isAdmin ? "Company name" : "Full name"}</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isAdmin ? "Acme Inc." : "Jane Doe"}
            />
          </div>
          {!isAdmin && (
            <>
              <div>
                <Label htmlFor="profile-role">Role / title</Label>
                <Input
                  id="profile-role"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  placeholder="Senior Engineer"
                />
              </div>
              <div>
                <Label htmlFor="profile-department">Department</Label>
                <Input
                  id="profile-department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Engineering"
                />
              </div>
            </>
          )}
          <div>
            <Label>Email</Label>
            <Input value={user.email} disabled />
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <a
            href="/marketing/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground hover:underline"
          >
            Terms of Service
          </a>
          <span aria-hidden>·</span>
          <a
            href="/marketing/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground hover:underline"
          >
            Privacy Policy
          </a>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleSignOut}
            className="gap-2 text-muted-foreground hover:text-destructive sm:mr-auto"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
