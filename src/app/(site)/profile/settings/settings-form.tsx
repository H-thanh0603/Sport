"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Button, Input, useToast } from "@/components/ui";

export function SettingsForm({
  initial,
}: {
  initial: { displayName: string; timezone: string };
}) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (displayName.trim().length < 2) {
      setError("Tên hiển thị tối thiểu 2 ký tự");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/v1/me", { displayName: displayName.trim(), timezone });
      toast({ title: "Đã lưu cài đặt", variant: "success" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể lưu. Thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-5">
      <Input
        label="Tên hiển thị"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        maxLength={64}
        required
      />
      <div className="space-y-1.5">
        <label htmlFor="tz" className="text-sm font-medium">
          Múi giờ hiển thị
        </label>
        <select
          id="tz"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          {["Asia/Ho_Chi_Minh", "Asia/Bangkok", "Europe/London", "Europe/Madrid", "America/New_York", "UTC"].map(
            (tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ),
          )}
        </select>
        <p className="text-xs text-muted-foreground">
          Thời gian trận đấu sẽ hiển thị theo múi giờ này.
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={saving}>
        {saving ? "Đang lưu…" : "Lưu thay đổi"}
      </Button>
    </form>
  );
}
