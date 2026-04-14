"use client";

export function ZentrixaTypingDots() {
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">Zentrixa is thinking...</span>
      <span className="flex items-center gap-1" aria-label="Zentrixa is thinking">
        <span className="zentrixa-thinking-dot" style={{ animationDelay: "0ms" }} />
        <span className="zentrixa-thinking-dot" style={{ animationDelay: "160ms" }} />
        <span className="zentrixa-thinking-dot" style={{ animationDelay: "320ms" }} />
      </span>
    </div>
  );
}
