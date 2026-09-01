"use client";

import { LogIn, Menu as MenuIcon, Trophy, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, Menu, Sheet } from "@/components/ui";
import { SearchCommandMenu } from "@/components/search/search-command-menu";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { api } from "@/lib/api-client";
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

type Me = { id: number; username: string; displayName: string; avatarUrl: string | null; role: string } | null;

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [me, setMe] = useState<Me>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    api
      .get<Me>("/api/v1/me")
      .then((user) => {
        if (!cancelled) setMe(user);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      })
      .finally(() => {
        if (!cancelled) setMeLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]); // re-check session on navigation (login/logout)

  const logout = async () => {
    await api.post("/api/v1/auth/logout").catch(() => {});
    setMe(null);
    router.push("/");
    router.refresh();
  };

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
          <SearchCommandMenu />
          <ThemeToggle />
          <NotificationCenter userId={me?.id ?? null} />
          {meLoaded && me ? (
            <Menu
              trigger={({ toggle }) => (
                <button type="button" aria-label={`Tài khoản ${me.displayName}`} onClick={toggle} className="ml-1 rounded-full">
                  <Avatar name={me.displayName} src={me.avatarUrl ?? undefined} />
                </button>
              )}
              items={[
                { key: "profile", label: "Trang cá nhân", onSelect: () => (window.location.href = "/profile") },
                ...(me.role === "admin" || me.role === "moderator"
                  ? [{ key: "admin", label: "Quản trị", onSelect: () => (window.location.href = "/admin") }]
                  : []),
                { key: "logout", label: "Đăng xuất", separatorBefore: true, onSelect: () => void logout() },
              ]}
            />
          ) : (
            <Link
              href="/login"
              className="ml-1 hidden items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 md:inline-flex"
            >
              <LogIn className="h-4 w-4" /> Đăng nhập
            </Link>
          )}
          {meLoaded && !me ? (
            <Link href="/register" aria-label="Đăng ký" className="hidden rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground md:block">
              <UserIcon className="h-5 w-5" />
            </Link>
          ) : null}
          {!meLoaded ? <span className="hidden h-8 w-8 md:block" aria-hidden /> : null}
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
          <span className="my-1 h-px bg-border" />
          {me ? (
            <>
              <Link href="/profile" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2 font-medium hover:bg-accent">
                Trang cá nhân
              </Link>
              <button type="button" onClick={() => void logout()} className="rounded-md px-3 py-2 text-left text-destructive hover:bg-accent">
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2 font-medium text-primary hover:bg-accent">
                Đăng nhập
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2 text-muted-foreground hover:bg-accent">
                Đăng ký
              </Link>
            </>
          )}
        </nav>
      </Sheet>
    </header>
  );
}
