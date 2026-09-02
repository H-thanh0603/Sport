import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { hasRole } from "@/server/auth/rbac";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = { title: "Admin — Sport" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (!hasRole(user, "moderator")) redirect("/403");
  return <AdminShell user={user}>{children}</AdminShell>;
}
