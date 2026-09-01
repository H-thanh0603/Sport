"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  key: string;
  label: ReactNode;
}

export function Tabs({
  tabs,
  value,
  defaultValue,
  onValueChange,
  className,
}: {
  tabs: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (key: string) => void;
  className?: string;
}) {
  const current = value ?? defaultValue;
  return (
    <div
      role="tablist"
      className={cn("flex gap-1 overflow-x-auto border-b border-border", className)}
    >
      {tabs.map((tab) => {
        const active = current === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onValueChange?.(tab.key)}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
