import { AlertCircle, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span aria-hidden className="text-muted-foreground/60">
        {icon ?? <Inbox className="h-10 w-10" />}
      </span>
      <p className="font-medium">{title}</p>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center"
    >
      <AlertCircle aria-hidden className="h-10 w-10 text-destructive" />
      <p className="font-medium">{message ?? "Không thể tải dữ liệu."}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          Thử lại
        </Button>
      ) : null}
    </div>
  );
}
