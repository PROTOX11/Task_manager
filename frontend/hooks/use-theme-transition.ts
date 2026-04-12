"use client";

import { useCallback, useRef, useState } from "react";
import { useTheme } from "next-themes";

type ThemeMode = "light" | "dark";

type TransitionOrigin = {
  x: number;
  y: number;
  radius: number;
  startRadius: number;
};

const TRANSITION_DURATION = 840;
const TRANSITION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const TRANSITION_CLEAR_DELAY = 40;

function supportsViewTransitions() {
  return typeof document !== "undefined" && "startViewTransition" in document;
}

function getThemeMode(theme: string | undefined, resolvedTheme: string | undefined) {
  return (theme === "system" ? resolvedTheme : theme) as ThemeMode | undefined;
}

function getTransitionOrigin(target?: HTMLElement | null): TransitionOrigin {
  if (typeof window === "undefined") {
    return { x: 0, y: 0, radius: 0, startRadius: 0 };
  }

  if (!target) {
    const x = window.innerWidth - 32;
    const y = 24;
    const startRadius = 16;
    return {
      x,
      y,
      radius: Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)),
      startRadius,
    };
  }

  const rect = target.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const startRadius = Math.max(10, Math.hypot(rect.width, rect.height) / 2);

  return {
    x,
    y,
    radius: Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)),
    startRadius,
  };
}

function setTransitionVars(
  scope: HTMLElement,
  origin: TransitionOrigin,
  nextTheme: ThemeMode,
) {
  scope.style.setProperty("--theme-transition-x", `${origin.x}px`);
  scope.style.setProperty("--theme-transition-y", `${origin.y}px`);
  scope.style.setProperty("--theme-transition-radius", `${origin.radius}px`);
  scope.style.setProperty("--theme-transition-start-radius", `${origin.startRadius}px`);
  scope.style.setProperty("--theme-transition-duration", `${TRANSITION_DURATION}ms`);
  scope.style.setProperty("--theme-transition-easing", TRANSITION_EASING);
  scope.style.setProperty("--theme-transition-wave-opacity", "0.3");
  scope.style.setProperty(
    "--theme-transition-surface",
    nextTheme === "dark"
      ? "var(--theme-transition-dark-surface)"
      : "var(--theme-transition-light-surface)",
  );
}

function clearTransitionVars(scope: HTMLElement) {
  scope.style.removeProperty("--theme-transition-x");
  scope.style.removeProperty("--theme-transition-y");
  scope.style.removeProperty("--theme-transition-radius");
  scope.style.removeProperty("--theme-transition-start-radius");
  scope.style.removeProperty("--theme-transition-duration");
  scope.style.removeProperty("--theme-transition-easing");
  scope.style.removeProperty("--theme-transition-wave-opacity");
  scope.style.removeProperty("--theme-transition-surface");
}

export function useThemeTransition() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionLockRef = useRef(false);
  const isDark = getThemeMode(theme, resolvedTheme) === "dark";

  const toggleTheme = useCallback(
    (target?: HTMLElement | null) => {
      if (transitionLockRef.current || typeof document === "undefined") {
        return;
      }

      transitionLockRef.current = true;
      const nextTheme: ThemeMode = isDark ? "light" : "dark";
      const origin = getTransitionOrigin(target);
      const root = document.documentElement;

      setTransitionVars(root, origin, nextTheme);

      if (supportsViewTransitions()) {
        setIsTransitioning(true);

        const anyDocument = document as Document & {
          startViewTransition?: (cb: () => void) => ViewTransition;
        };

        const transition = anyDocument.startViewTransition?.(() => {
          setTheme(nextTheme);
        });

        if (!transition) {
          clearTransitionVars(root);
          transitionLockRef.current = false;
          setIsTransitioning(false);
          return;
        }

        transition?.finished.finally(() => {
          clearTransitionVars(root);
          transitionLockRef.current = false;
          setIsTransitioning(false);
        });

        return;
      }

      setIsTransitioning(true);
      const body = document.body;
      body.setAttribute("data-theme-transition", nextTheme);

      const cleanup = () => {
        window.setTimeout(() => {
          clearTransitionVars(root);
          body.removeAttribute("data-theme-transition");
          transitionLockRef.current = false;
          setIsTransitioning(false);
        }, TRANSITION_CLEAR_DELAY);
      };

      body.addEventListener(
        "animationend",
        (event) => {
          if (event.pseudoElement && event.pseudoElement !== "::before") {
            return;
          }

          setTheme(nextTheme);
          cleanup();
        },
        { once: true },
      );

      body.addEventListener(
        "animationcancel",
        (event) => {
          if (event.pseudoElement && event.pseudoElement !== "::before") {
            return;
          }

          setTheme(nextTheme);
          cleanup();
        },
        { once: true },
      );
    },
    [isDark, setTheme],
  );

  return {
    isDark,
    isTransitioning,
    toggleTheme,
  };
}
