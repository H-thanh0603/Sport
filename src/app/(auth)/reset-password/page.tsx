"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { AUTH_API, getErrorMessage, postJson } from "../auth-client";
import { Button, Card, CardContent, Input, Spinner } from "@/components/ui";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(undefined);
    const env = await postJson(`${AUTH_API}/reset-password`, { token, password });
    setLoading(false);
    if (!env.success) {
      setError(getErrorMessage(env, "Đặt lại mật khẩu thất bại. Token hết hạn hoặc không hợp lệ."));
      return;
    }
    router.push("/login");
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h1 className="text-xl font-bold">Đặt lại mật khẩu</h1>
          <p className="text-sm text-muted-foreground">Nhập mật khẩu mới cho tài khoản của bạn.</p>
        </div>
        {!token ? (
          <p role="alert" className="text-sm text-destructive">
            Thiếu token. Mở link trong email đặt lại mật khẩu.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3" noValidate>
            <Input label="Mật khẩu mới" name="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" loading={loading} className="w-full">
              Đặt lại mật khẩu
            </Button>
          </form>
        )}
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            ← Về đăng nhập
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Spinner label="Đang tải…" />}>
      <ResetForm />
    </Suspense>
  );
}
