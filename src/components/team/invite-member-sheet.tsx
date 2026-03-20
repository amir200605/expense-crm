"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

async function inviteMember(data: {
  name: string;
  username: string;
  password: string;
  role: string;
}) {
  const res = await fetch("/api/team/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to invite member");
  }
  return res.json();
}

export function InviteMemberSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("AGENT");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: inviteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      setSuccess(true);
      setName("");
      setUsername("");
      setPassword("");
      setRole("AGENT");
      setPhone("");
      setLicenseNumber("");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({ name, username, password, role });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Invite team member</SheetTitle>
          <SheetDescription>
            Add a new agent or manager to your team.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="invite-name">Name</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-username">Username</Label>
            <Input
              id="invite-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="johndoe"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-password">Password</Label>
            <Input
              id="invite-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Min 8 characters"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AGENT">Agent</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-phone">Phone (for card preview)</Label>
            <Input
              id="invite-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(877) 864-9126"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-license">License / NPN (for card preview)</Label>
            <Input
              id="invite-license"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="20062397"
            />
          </div>

          <Card className="overflow-hidden border-border/80">
            <div className="bg-primary px-4 py-3 text-primary-foreground">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                Prime Insurance Agency
              </p>
            </div>
            <div className="bg-card p-4">
              <div className="flex items-start gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-primary/30 bg-muted text-xl font-semibold text-primary">
                  {(name.trim().charAt(0) || username.trim().charAt(0) || "A").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-base font-bold uppercase tracking-wide text-primary">
                    {name.trim() || "NEW TEAM MEMBER"}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {role.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Username: {username.trim() || "pending"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    NPN: {licenseNumber.trim() || "pending"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Phone: {phone.trim() || "pending"}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {mutation.isError && (
            <p className="text-sm text-destructive">{mutation.error.message}</p>
          )}

          {success && (
            <p className="text-sm font-medium text-green-600">
              Member invited successfully! Preview card generated.
            </p>
          )}

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Inviting..." : "Invite member"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
