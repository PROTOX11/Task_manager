"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STORAGE_PREFIX = "zentrixa:scroll:";

export function RouteScrollRestorer() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const key = `${STORAGE_PREFIX}${pathname}`;
    const saved = window.localStorage.getItem(key);
    if (saved) {
      const y = Number(saved);
      if (!Number.isNaN(y)) {
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: y, behavior: "auto" });
        });
      }
    }
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const key = `${STORAGE_PREFIX}${pathname}`;
    let raf = 0;

    const persist = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        window.localStorage.setItem(key, String(window.scrollY));
      });
    };

    window.addEventListener("scroll", persist, { passive: true });
    persist();

    return () => {
      window.removeEventListener("scroll", persist);
      window.cancelAnimationFrame(raf);
      window.localStorage.setItem(key, String(window.scrollY));
    };
  }, [pathname]);

  return null;
}
