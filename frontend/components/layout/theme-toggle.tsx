"use client";

import type React from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useThemeTransition } from "@/hooks/use-theme-transition";

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ showLabel = false, className }: ThemeToggleProps) {
  const { isDark, isTransitioning, toggleTheme } = useThemeTransition();

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    toggleTheme(event.currentTarget);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={showLabel ? "default" : "icon"}
      className={cn(
        "group relative isolate overflow-hidden border-border/70 bg-[linear-gradient(135deg,rgba(255,252,247,0.98),rgba(237,220,198,0.95))] text-foreground shadow-sm shadow-[rgba(117,86,56,0.12)] transition-[transform,box-shadow,background-color,border-color] duration-300 ease-out will-change-transform hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.98] dark:border-border/60 dark:bg-[linear-gradient(135deg,rgba(68,45,30,0.96),rgba(31,21,15,0.98))] dark:text-foreground",
        showLabel
          ? "h-11 min-w-[8.5rem] gap-3 rounded-full px-4 py-2.5 max-[767px]:h-12 max-[767px]:min-w-[9rem] max-[767px]:px-4 max-[767px]:py-3"
          : "h-10 w-10 rounded-full p-0 sm:h-10 sm:w-10 max-[767px]:h-11 max-[767px]:w-11",
        isTransitioning && "scale-[0.97] shadow-md",
        className,
      )}
      onClick={handleToggle}
      aria-pressed={isDark}
      aria-label="Toggle theme"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_38%)] opacity-80 dark:opacity-20" />
      <span className="absolute inset-[1px] rounded-[inherit] border border-white/45 bg-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)] dark:border-white/10 dark:bg-white/5" />
      <span className="relative z-10 flex items-center gap-2">
        <span className="relative flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[linear-gradient(145deg,rgba(255,255,255,0.82),rgba(244,226,204,0.92))] shadow-[0_8px_20px_rgba(120,88,54,0.18)] ring-1 ring-white/60 transition-transform duration-300 ease-out dark:bg-[linear-gradient(145deg,rgba(138,94,54,0.45),rgba(83,56,33,0.7))] dark:ring-white/10 sm:h-[30px] sm:w-[30px] max-[767px]:h-[32px] max-[767px]:w-[32px]">
          <SunMedium className="absolute h-[15px] w-[15px] scale-100 rotate-0 text-amber-800 transition-all duration-500 ease-in-out dark:scale-0 dark:-rotate-90 sm:h-[17px] sm:w-[17px] max-[767px]:h-[18px] max-[767px]:w-[18px]" />
          <MoonStar className="absolute h-[15px] w-[15px] scale-0 rotate-90 text-amber-100 transition-all duration-500 ease-in-out dark:scale-100 dark:rotate-0 sm:h-[17px] sm:w-[17px] max-[767px]:h-[18px] max-[767px]:w-[18px]" />
        </span>
        {showLabel && (
          <span className="flex flex-col items-start leading-none">
            <span className="text-[10px] uppercase tracking-[0.28em] text-foreground/60 max-[767px]:text-[11px]">
              Theme
            </span>
            <span className="text-sm font-semibold text-foreground/95 max-[767px]:text-[1rem]">
              {isDark ? "Dark" : "Light"}
            </span>
          </span>
        )}
      </span>
    </Button>
  );
}
