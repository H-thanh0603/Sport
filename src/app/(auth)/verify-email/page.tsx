"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AUTH_API } from "../auth-client";
import { Button, Card, CardContent, Spinner } from "@/components/ui";

type State = "verifying" | "ok" | "missing";

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>(token ? "verifying" : "missing");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${AUTH_API}/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const env = (await res.json()) as { success: boolean };
        if (!cancelled) setState(env.success ? "ok" : "missing");
      } catch {
        if (!cancelled) setState("missing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <Card>
      <CardContent className="space-y-4 p-6 text-center">
        <h1 className="text-xl font-bold">Xác thực email</h1>
        {state === "verifying" ? <Spinner label="Đang xác thực…" /> : null}
        {state === "ok" ? (
          <>
            <p role="status" className="text-sm text-success">
              Email đã xác thực thành công.
            </p>
            <Button>
              <Link href="/login">Đăng nhập</Link>
            </Button>
          </>
        ) : null}
        {state === "missing" ? (
          <>
            <p role="alert" className="text-sm text-destructive">
              Token không hợp lệ hoặc đã hết hạn. Mở link mới trong email.
            </p>
            <Button variant="outline">
              <Link href="/login">Về đăng nhập</Link>
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Spinner label="Đang tải…" />}>
      <VerifyInner />
    </Suspense>
  );
}
