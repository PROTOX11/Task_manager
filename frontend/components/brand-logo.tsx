"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
}

export function BrandLogo({
  className,
  imageClassName,
  priority = false,
  sizes = "(max-width: 768px) 180px, 240px",
}: BrandLogoProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(244,237,230,0.92))] p-2 shadow-sm shadow-black/5 ring-1 ring-white/60 backdrop-blur-sm dark:border-border/50 dark:bg-[linear-gradient(145deg,rgba(35,26,18,0.92),rgba(17,14,10,0.96))] dark:shadow-black/30 dark:ring-white/10",
        className,
      )}
    >
      <Image
        src="/logo/logo.png"
        alt="Tickzen"
        fill
        priority={priority}
        sizes={sizes}
        className={cn(
          "object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.08)] dark:brightness-110 dark:contrast-105 dark:saturate-110 dark:drop-shadow-[0_10px_22px_rgba(0,0,0,0.35)]",
          imageClassName,
        )}
      />
    </div>
  );
}
