"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AUTH_API, getErrorMessage, postJson } from "../auth-client";
import { Button, Card, CardContent, Input } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", username: "", displayName: "", password: "" });
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(undefined);
    const env = await postJson(`${AUTH_API}/register`, form);
    setLoading(false);
    if (!env.success) {
      setError(getErrorMessage(env, "Đăng ký thất bại."));
      return;
    }
    router.push("/verify-email");
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h1 className="text-xl font-bold">Đăng ký</h1>
          <p className="text-sm text-muted-foreground">Miễn phí, mất 30 giây.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <Input label="Email" name="email" type="email" required autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          <Input label="Tên đăng nhập" name="username" required minLength={3} maxLength={32} autoComplete="username" value={form.username} onChange={(e) => set("username", e.target.value)} />
          <Input label="Tên hiển thị" name="displayName" required maxLength={64} value={form.displayName} onChange={(e) => set("displayName", e.target.value)} />
          <Input label="Mật khẩu" name="password" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} />
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" loading={loading} className="w-full">
            Tạo tài khoản
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
