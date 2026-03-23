"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppBreadcrumbs } from "@/components/layout/breadcrumbs";
import type { SessionUser } from "@/lib/permissions";
import { Search, Bell, LayoutDashboard, Settings as SettingsIcon, LogOut, UserPlus } from "lucide-react";

interface AppNotification {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export function Navbar({ user }: { user: SessionUser }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (notificationsOpen) fetchNotifications();
  }, [notificationsOpen, fetchNotifications]);

  async function markRead(id: string) {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAllRead: true }) });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";
  const npnNumber = user?.npnNumber?.trim() ? user.npnNumber : "N/A";

  return (
    <header className="navbar-dark sticky top-0 z-40 flex h-14 shrink-0 items-center gap-6 px-4 lg:px-6">
      {/* Brand (visible when sidebar is present; optional duplicate for identity) */}
      <Link
        href="/dashboard"
        className="hidden items-center gap-2 rounded-lg py-2 pr-3 text-sidebar-foreground transition-colors hover:bg-white/10 sm:flex"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LayoutDashboard className="h-4 w-4" />
        </span>
        <span className="font-semibold text-sm tracking-tight">ExpenseFlow</span>
      </Link>

      {/* Search */}
      <div className="hidden flex-1 max-w-md lg:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-muted" />
          <Input
            placeholder="Search leads, clients..."
            className="h-9 rounded-lg border-0 bg-white/10 pl-9 text-sidebar-foreground placeholder:text-sidebar-muted focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* Breadcrumbs (center on small, left after brand on large) */}
      <div className="min-w-0 lg:flex-none">
        <AppBreadcrumbs variant="dark" />
      </div>

      {/* Actions */}
      <div className="ml-auto flex items-center gap-1">
        <div className="hidden md:flex items-center rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium tracking-wide text-sidebar-foreground/90">
          NPN: {npnNumber}
        </div>
        <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-lg text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-72 rounded-xl border border-border bg-card p-1.5 shadow-card"
          >
            <div className="flex items-center justify-between px-3 py-2">
              <DropdownMenuLabel className="p-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notifications
              </DropdownMenuLabel>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); markAllRead(); }}
                  className="text-xs text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <DropdownMenuSeparator className="my-1" />
            <div className="max-h-64 overflow-auto py-1">
              {notifications.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No new notifications
                </div>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    asChild
                    className={n.read ? "" : "bg-primary/5"}
                  >
                    <Link
                      href={n.link || "#"}
                      onClick={() => {
                        if (!n.read) markRead(n.id);
                        setNotificationsOpen(false);
                      }}
                      className="flex flex-col items-start gap-0.5 px-3 py-2.5 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="text-sm font-medium text-foreground">{n.title}</span>
                      </div>
                      {n.message && <span className="text-xs text-muted-foreground pl-5">{n.message}</span>}
                    </Link>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 w-9 rounded-full p-0 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Avatar className="h-9 w-9 border-2 border-primary/30">
                <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? ""} />
                <AvatarFallback className="bg-primary/20 text-primary font-medium text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            forceMount
            className="w-56 rounded-xl border border-border bg-card p-1.5 shadow-card"
          >
            <DropdownMenuLabel className="px-3 py-2 font-normal">
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-semibold text-foreground">{user?.name ?? "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                {user?.role && (
                  <p className="text-xs text-muted-foreground capitalize">{user.role.replace("_", " ").toLowerCase()}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2.5 text-sm focus:bg-accent focus:text-accent-foreground">
              <Link href="/settings" className="flex items-center gap-2.5">
                <SettingsIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
