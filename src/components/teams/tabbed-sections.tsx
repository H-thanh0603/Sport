"use client";

import { useState, type ReactNode } from "react";
import { Tabs } from "@/components/ui";

export function TabbedSections({
  tabs,
  sections,
  initialTab,
}: {
  tabs: { key: string; label: ReactNode }[];
  sections: Record<string, ReactNode>;
  initialTab?: string;
}) {
  const [active, setActive] = useState(initialTab ?? tabs[0]?.key ?? "");
  return (
    <div className="animate-fade-in">
      <Tabs tabs={tabs} value={active} onValueChange={setActive} className="mb-4" />
      <div key={active} className="animate-fade-in">{sections[active]}</div>
    </div>
  );
}
