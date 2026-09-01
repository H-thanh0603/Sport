import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";

export const metadata: Metadata = { title: "Tài khoản" };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <Link href="/" className="flex items-center gap-1.5 text-xl font-bold">
        <Trophy aria-hidden className="h-7 w-7 text-primary" />
        Sport
      </Link>
      <div className="w-full max-w-sm">{children}</div>
      <p className="text-xs text-muted-foreground">
        © {new Date().getFullYear()} Sport
      </p>
    </div>
  );
}
