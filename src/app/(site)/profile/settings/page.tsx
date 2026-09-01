import type { Metadata } from "next";
import { requireUserPage } from "@/server/auth/rbac";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Cài đặt hồ sơ — Sport" };

export default async function ProfileSettingsPage() {
  const user = await requireUserPage();
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Cài đặt hồ sơ</h1>
      <SettingsForm
        initial={{ displayName: user.displayName, timezone: "Asia/Ho_Chi_Minh" }}
      />
    </div>
  );
}
