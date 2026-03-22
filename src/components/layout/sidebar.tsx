"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/permissions";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Kanban,
  CheckSquare,
  Calendar,
  FileText,
  DollarSign,
  AlertCircle,
  MessageSquare,
  MessagesSquare,
  Workflow,
  BarChart3,
  UsersRound,
  Settings,
  Shield,
  ChevronDown,
  LogOut,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ElementType; roles?: string[] };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Sales",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/leads", label: "Leads", icon: Users },
      { href: "/pipeline", label: "Pipeline", icon: Kanban },
      { href: "/clients", label: "Clients", icon: UserCircle },
    ],
  },
  {
    label: "Activity",
    items: [
      { href: "/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/calendar", label: "Calendar", icon: Calendar },
      { href: "/messages", label: "Messages", icon: MessagesSquare },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/policies", label: "Policies", icon: FileText },
      { href: "/commissions", label: "Commissions", icon: DollarSign, roles: ["SUPER_ADMIN", "AGENCY_OWNER", "MANAGER"] },
      { href: "/chargebacks", label: "Chargebacks", icon: AlertCircle, roles: ["SUPER_ADMIN", "AGENCY_OWNER", "MANAGER"] },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/communications", label: "Communications", icon: MessageSquare },
      { href: "/automations", label: "Automations", icon: Workflow, roles: ["SUPER_ADMIN", "AGENCY_OWNER", "MANAGER"] },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3, roles: ["SUPER_ADMIN", "AGENCY_OWNER", "MANAGER", "QA_COMPLIANCE"] },
    ],
  },
  {
    label: "Organization",
    items: [
      { href: "/team", label: "Team", icon: UsersRound, roles: ["SUPER_ADMIN", "AGENCY_OWNER", "MANAGER"] },
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/admin", label: "Admin", icon: Shield, roles: ["SUPER_ADMIN"] },
    ],
  },
];

function getGroupContainingPath(pathname: string): string | null {
  for (const group of navGroups) {
    const match = group.items.some(
      (item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))
    );
    if (match) return group.label;
  }
  return null;
}

export function Sidebar({ user, onOpenMessages }: { user: SessionUser; onOpenMessages?: () => void }) {
  const pathname = usePathname();
  const role = user?.role ?? "";

  const initialOpen = useMemo(() => {
    const current = getGroupContainingPath(pathname);
    const open = new Set<string>(["Sales"]);
    if (current) open.add(current);
    return open;
  }, []);

  const [openGroups, setOpenGroups] = useState<Set<string>>(initialOpen);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const group = getGroupContainingPath(pathname);
    if (group) setOpenGroups((prev) => new Set(prev).add(group));
  }, [pathname]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };
  const displayName = user?.name?.trim() || user?.username?.trim() || "User";
  const displayEmail = user?.email?.trim() || "—";
  const displayRole = user?.role ? user.role.replace(/_/g, " ").toLowerCase() : "user";
  const insuranceId = user?.id ? user.id.slice(0, 8).toUpperCase() : "pending";
  const firstLetter = (displayName.charAt(0) || "U").toUpperCase();

  return (
    <aside className="sidebar-dark flex h-full w-56 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-white/10 px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 rounded-lg py-2 pr-2 transition-colors hover:bg-white/5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <LayoutDashboard className="h-4 w-4" />
          </span>
          <span className="font-semibold text-sm tracking-tight text-sidebar-foreground">ExpenseFlow</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 scrollbar-thin">
        {navGroups.map((group) => {
          const visible = group.items.filter((item) => {
            if (!item.roles) return true;
            return item.roles.includes(role);
          });
          if (visible.length === 0) return null;

          const isOpen = openGroups.has(group.label);

          return (
            <div key={group.label} className="space-y-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted transition-colors hover:bg-white/10 hover:text-sidebar-foreground"
                )}
              >
                <span>{group.label}</span>
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")}
                />
              </button>
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-200 ease-out",
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <div className="space-y-0.5 pt-0.5">
                    {visible.map((item) => {
                      const Icon = item.icon;
                      const active =
                        pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                      const isMessages = item.href === "/messages" && onOpenMessages;
                      if (isMessages) {
                        return (
                          <button
                            key={item.href}
                            type="button"
                            onClick={onOpenMessages}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-all duration-200",
                              "text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground"
                            )}
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sidebar-muted">
                              <Icon className="h-4 w-4" />
                            </span>
                            {item.label}
                          </button>
                        );
                      }
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-all duration-200",
                            active
                              ? "bg-primary/20 text-sidebar-foreground"
                              : "text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                              active ? "bg-primary text-primary-foreground" : "bg-white/10 text-sidebar-muted"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="bg-primary px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-foreground whitespace-nowrap">
            Prime Insurance Agency
          </div>
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-3 text-left"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="min-w-0 text-xs text-sidebar-muted">
                <p className="truncate text-sm font-semibold uppercase tracking-wide text-sidebar-foreground">
                  {displayName}
                </p>
                <p className="uppercase">{displayRole}</p>
                <p className="truncate">{user?.phone ?? ""}</p>
                <p className="truncate">NPN: {user?.npnNumber ?? "pending"}</p>
              </div>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-sidebar-muted transition-transform", profileOpen && "rotate-180")} />
          </button>
          {profileOpen && (
            <div className="border-t border-white/10 p-2 space-y-1">
              <p className="truncate px-2 text-xs text-sidebar-muted">{displayEmail}</p>
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground transition-colors"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
