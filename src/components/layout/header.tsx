"use client";

import { Bell, LogIn, Menu as MenuIcon, Search, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, Badge, Menu, Sheet } from "@/components/ui";
import { cn } from "@/lib/utils";

const SPORTS = [
  { slug: "football", name: "Bóng đá", emoji: "⚽" },
  { slug: "basketball", name: "Bóng rổ", emoji: "🏀" },
  { slug: "tennis", name: "Tennis", emoji: "🎾" },
  { slug: "badminton", name: "Cầu lông", emoji: "🏸" },
  { slug: "volleyball", name: "Bóng chuyền", emoji: "🏐" },
  { slug: "esports", name: "Esports", emoji: "🎮" },
];

const NAV = [
  { href: "/schedule", label: "Lịch thi đấu" },
  { href: "/results", label: "Kết quả" },
  { href: "/standings", label: "BXH" },
  { href: "/news", label: "Tin tức" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <button
          type="button"
          aria-label="Mở menu"
          className="rounded-md p-2 text-muted-foreground hover:text-foreground md:hidden"
          onClick={() => setMenuOpen(true)}
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        <Link href="/" className="flex items-center gap-1.5 font-bold">
          <Trophy aria-hidden className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline">Sport</span>
        </Link>

        <nav aria-label="Menu chính" className="hidden items-center gap-1 lg:flex">
          <Link
            href="/"
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-accent",
              pathname === "/" && "text-primary",
            )}
          >
            Trang chủ
          </Link>
          {SPORTS.map((s) => (
            <Link
              key={s.slug}
              href={`/schedule?sport=${s.slug}`}
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <span aria-hidden>{s.emoji}</span> {s.name}
            </Link>
          ))}
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-accent",
                pathname.startsWith(item.href) ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {/* TODO(e): thay bằng global search (Cmd+K) */}
          <Link
            href="/search"
            aria-label="Tìm kiếm"
            className="hidden rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground sm:block"
          >
            <Search className="h-5 w-5" />
          </Link>
          <ThemeToggle />
          {/* TODO(e): notifications bell thật + realtime */}
          <Menu
            trigger={({ toggle }) => (
              <button
                type="button"
                aria-label="Thông báo"
                onClick={toggle}
                className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Bell className="h-5 w-5" />
                <Badge variant="live" className="absolute -right-0.5 -top-0.5 h-4 min-w-4 animate-pulse-live px-1 text-[10px]">
                  3
                </Badge>
              </button>
            )}
            items={[
              { key: "n1", label: "TODO(e): danh sách thông báo" },
            ]}
          />
          {/* TODO(e): user menu thật sau khi login (avatar, profile, logout) */}
          <Menu
            trigger={({ toggle }) => (
              <button type="button" aria-label="Tài khoản" onClick={toggle} className="ml-1 rounded-full">
                <Avatar name="Khách" />
              </button>
            )}
            items={[
              { key: "login", label: "Đăng nhập", onSelect: () => (window.location.href = "/login") },
              { key: "register", label: "Đăng ký", onSelect: () => (window.location.href = "/register") },
              { key: "profile", separatorBefore: true, label: "Trang cá nhân", onSelect: () => (window.location.href = "/profile") },
            ]}
          />
          <Link
            href="/login"
            className="ml-1 hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 md:inline-flex"
          >
            <LogIn className="h-4 w-4" /> Đăng nhập
          </Link>
        </div>
      </div>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        <nav aria-label="Menu di động" className="flex flex-col gap-1">
          <Link href="/" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2 font-medium hover:bg-accent">
            Trang chủ
          </Link>
          {SPORTS.map((s) => (
            <Link
              key={s.slug}
              href={`/schedule?sport=${s.slug}`}
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <span aria-hidden>{s.emoji}</span> {s.name}
            </Link>
          ))}
          <span className="my-1 h-px bg-border" />
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </Sheet>
    </header>
  );
}
