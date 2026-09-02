"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Newspaper,
  MessageSquare,
  Flag,
  Menu as MenuIcon,
  Shield,
} from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/server/auth/session";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/matches", label: "Matches", icon: CalendarDays },
  { href: "/admin/news", label: "News", icon: Newspaper },
  { href: "/admin/comments", label: "Comments", icon: MessageSquare },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function AdminShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card md:flex" aria-label="Admin menu">
        <div className="flex h-14 items-center gap-2 border-b px-4 font-bold">
          <Shield className="h-5 w-5 text-primary" aria-hidden />
          Admin
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <AdminNavLink key={item.href} {...item} active={pathname === item.href} />
          ))}
        </nav>
        <div className="border-t p-3">
          <Link href="/" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground">
            ← Về trang chủ
          </Link>
        </div>
      </aside>

      {/* sidebar mobile */}
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/60 md:hidden" onClick={() => setOpen(false)}>
          <aside className="h-full w-64 border-r bg-card p-3" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex h-10 items-center gap-2 px-2 font-bold">
              <Shield className="h-5 w-5 text-primary" aria-hidden /> Admin
            </div>
            {NAV.map((item) => (
              <AdminNavLink key={item.href} {...item} active={pathname === item.href} onClick={() => setOpen(false)} />
            ))}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4">
          <button type="button" aria-label="Mở menu admin" className="rounded-md p-2 hover:bg-muted md:hidden" onClick={() => setOpen(true)}>
            <MenuIcon className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {NAV.find((n) => n.href === pathname)?.label ?? "Admin"}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant={user.role === "admin" ? "default" : "outline"}>{user.role}</Badge>
            <Avatar name={user.displayName} src={user.avatarUrl} className="h-8 w-8 text-xs" />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

function AdminNavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof Users;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  );
}
