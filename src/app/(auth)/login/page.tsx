"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AUTH_API, getErrorMessage, postJson } from "../auth-client";
import { Button, Card, CardContent, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(undefined);
    const env = await postJson(`${AUTH_API}/login`, { email, password });
    setLoading(false);
    if (!env.success) {
      setError(getErrorMessage(env, "Đăng nhập thất bại."));
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h1 className="text-xl font-bold">Đăng nhập</h1>
          <p className="text-sm text-muted-foreground">Đăng nhập để lưu đội yêu thích và nhận thông báo.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <Input label="Email" name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Mật khẩu" name="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" loading={loading} className="w-full">
            Đăng nhập
          </Button>
        </form>
        <div className="flex justify-between text-sm">
          <Link href="/forgot-password" className="text-primary hover:underline">
            Quên mật khẩu?
          </Link>
          <Link href="/register" className="text-primary hover:underline">
            Tạo tài khoản
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
