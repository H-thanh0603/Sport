import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <ShieldAlert className="h-14 w-14 text-warning" aria-hidden />
      <h1 className="text-3xl font-bold">403 — Không có quyền truy cập</h1>
      <p className="max-w-md text-muted-foreground">
        Bạn không đủ quyền để xem trang này. Liên hệ quản trị viên nếu cho rằng đây là nhầm lẫn.
      </p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
