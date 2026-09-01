"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AUTH_API, getErrorMessage, postJson } from "../auth-client";
import { Button, Card, CardContent, Input } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(undefined);
    const env = await postJson(`${AUTH_API}/forgot-password`, { email });
    setLoading(false);
    if (!env.success) {
      setError(getErrorMessage(env, "Không gửi được email đặt lại."));
      return;
    }
    setSent(true);
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h1 className="text-xl font-bold">Quên mật khẩu</h1>
          <p className="text-sm text-muted-foreground">Nhập email — chúng tôi gửi link đặt lại mật khẩu.</p>
        </div>
        {sent ? (
          <p role="status" className="rounded-md bg-success/10 p-3 text-sm text-success">
            Nếu email tồn tại, link đặt lại đã được gửi. Kiểm tra hộp thư (dev: xem log server).
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3" noValidate>
            <Input label="Email" name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" loading={loading} className="w-full">
              Gửi link đặt lại
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
