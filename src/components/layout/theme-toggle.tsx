"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers";
import { Tooltip } from "@/components/ui";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Tooltip content={theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}>
      <button
        type="button"
        aria-label={theme === "dark" ? "Bật chế độ sáng" : "Bật chế độ tối"}
        onClick={toggle}
        className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
    </Tooltip>
  );
}
