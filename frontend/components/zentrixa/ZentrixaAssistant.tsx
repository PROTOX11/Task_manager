"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Loader2, Mic, MicOff, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useVoiceRecognition } from "@/hooks/use-voice-recognition";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-context";
import {
  type ZentrixaContext,
  confirmZentrixaCommand,
  getZentrixaMessages,
  sendZentrixaMessage,
} from "@/lib/zentrixa-api";
import { ZentrixaTypingDots } from "./ZentrixaTyping";

type Message = { role: "assistant" | "user"; content: string };
type ProjectLookup = (id: string) => { name?: string } | undefined;
type PendingConfirmation = {
  command: string;
  message: string;
  payload: Record<string, unknown>;
};

const QUICK_COMMANDS = [
  "create task",
  "assign task",
  "change status",
  "comment task",
  "show overdue tasks",
  "create project",
];

const buildProjectContext = (
  context: ZentrixaContext | undefined,
  routeProjectId: string | undefined,
  getProjectById: ProjectLookup
) => {
  const projectId = context?.projectId || routeProjectId || undefined;
  const project = projectId ? getProjectById(projectId) : undefined;

  return {
    projectId,
    projectName: project?.name,
  };
};

export function ZentrixaAssistant({ context }: { context?: ZentrixaContext }) {
  const { user } = useAuth();
  const { getProjectById } = useData();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "I’m Zentrixa. Tell me what you want to do." },
  ]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<Record<string, unknown> | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

  const shellRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const openFrameRef = useRef<number | null>(null);

  const routeProjectId = useMemo(() => {
    const match = pathname?.match(/^\/projects\/([^/?#]+)/);
    return match?.[1];
  }, [pathname]);

  const activeProject = useMemo(
    () => buildProjectContext(context, routeProjectId, getProjectById),
    [context, getProjectById, routeProjectId]
  );

  useEffect(() => {
    if (open) {
      setMounted(true);
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      if (openFrameRef.current !== null) {
        window.cancelAnimationFrame(openFrameRef.current);
      }
      openFrameRef.current = window.requestAnimationFrame(() => {
        setPanelVisible(true);
        openFrameRef.current = null;
      });
      return;
    }

    setPanelVisible(false);
    if (openFrameRef.current !== null) {
      window.cancelAnimationFrame(openFrameRef.current);
      openFrameRef.current = null;
    }

    closeTimerRef.current = window.setTimeout(() => {
      setMounted(false);
      closeTimerRef.current = null;
    }, 240);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && shellRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  useEffect(() => {
    if (!user || historyLoaded) return;

    let cancelled = false;
    const loadHistory = async () => {
      try {
        const history = await getZentrixaMessages(40);
        if (cancelled) return;
        setMessages(
          history.length > 0
            ? history.map((item) => ({ role: item.role, content: item.content }))
            : [{ role: "assistant", content: "I’m Zentrixa. Tell me what you want to do." }]
        );
      } catch {
        // Keep the local conversation if history is unavailable.
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    };

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [historyLoaded, user]);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  const isAffirmativeReply = (value: string) => /(?:^|\b)(yes|yep|yeah|confirm|do it|add|proceed|ok|okay|sure)(?:\b|$)/i.test(value.trim());
  const isNegativeReply = (value: string) => /(?:^|\b)(no|nope|cancel|stop|never mind|nevermind|don't|dont)(?:\b|$)/i.test(value.trim());

  const postAssistantMessage = (content: string) => {
    setMessages((current) => [...current, { role: "assistant", content }]);
  };

  const sendConfirmationDecision = async (confirmed: boolean, label: string) => {
    if (!pendingConfirmation || !user) return;

    setLoading(true);
    setIsThinking(true);
    setMessages((current) => [...current, { role: "user", content: label }]);

    try {
      const result = await confirmZentrixaCommand({
        confirmed,
        text: label,
        payload: pendingConfirmation.payload,
        context: {
          ...context,
          ...activeProject,
          pendingCommand,
        },
      });

      postAssistantMessage(result.reply || result.message || "I’m here with you.");
      setPendingConfirmation(null);
      setPendingCommand(null);
      if (result.executed) {
        toast.success(result.reply || "Done.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "I couldn’t complete that.";
      postAssistantMessage(message);
      toast.error(message);
    } finally {
      setIsThinking(false);
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleSend = async (rawText: string) => {
    const cleaned = rawText.trim();
    if (!cleaned || loading || !user) return;

    if (pendingConfirmation && isAffirmativeReply(cleaned)) {
      setInput("");
      await sendConfirmationDecision(true, cleaned);
      return;
    }

    if (pendingConfirmation && isNegativeReply(cleaned)) {
      setInput("");
      await sendConfirmationDecision(false, cleaned);
      return;
    }

    setInput("");
    setLoading(true);
    setIsThinking(true);
    setMessages((current) => [...current, { role: "user", content: cleaned }]);

    try {
      const result = await sendZentrixaMessage({
        text: cleaned,
        context: {
          ...context,
          ...activeProject,
          pendingCommand,
        },
      });

      const reply = result.reply || result.message || "I’m here with you.";
      postAssistantMessage(reply);

      if (result.type === "CONFIRM" || result.requiresConfirmation) {
        setPendingConfirmation(
          result.payload && result.command
            ? {
                command: result.command,
                message: reply,
                payload: result.payload,
              }
            : null
        );
        setPendingCommand(null);
      } else if (result.requiresClarification || (result.missing && result.missing.length > 0)) {
        setPendingCommand((result.pendingCommand as Record<string, unknown> | null) || {
          intent: result.intent,
          missing: result.missing || [],
          text: cleaned,
        });
        setPendingConfirmation(null);
      } else {
        setPendingCommand(null);
        setPendingConfirmation(null);
      }

      if (result.mode === "command" && result.intent && !result.requiresClarification && result.type !== "CONFIRM") {
        toast.success(reply);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "I couldn’t understand that.";
      setMessages((current) => [...current, { role: "assistant", content: message }]);
      toast.error(message);
    } finally {
      setIsThinking(false);
      setLoading(false);
      scrollToBottom();
    }
  };

  const { supported, isListening, error, startListening, stopListening } = useVoiceRecognition({
    onFinalResult: async (text) => {
      setInput(text);
      await handleSend(text);
    },
  });

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, historyLoaded]);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [messages, isThinking, open, pendingCommand, pendingConfirmation]);

  const quickFill = (value: string) => {
    setInput(value);
    setOpen(true);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const startVoice = () => {
    if (!supported) {
      toast.error("Voice input isn’t available in this browser.");
      return;
    }

    setOpen(true);
    window.requestAnimationFrame(() => {
      try {
        startListening();
      } catch {
        toast.error("Voice input could not start. Please try again.");
      }
    });
  };

  return (
    <div ref={shellRef} className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {mounted && (
        <Card
          data-state={open && panelVisible ? "open" : "closed"}
          className="zentrixa-panel absolute bottom-16 right-0 mb-3 flex h-[min(70vh,calc(100dvh-5.5rem))] w-[calc(100vw-1rem)] overflow-hidden border-border/70 bg-card/95 shadow-2xl backdrop-blur-xl transform-gpu will-change-transform sm:w-[380px]"
        >
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4">
            <div className="flex shrink-0 items-center justify-between border-b border-border/70 pb-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    Zentrixa
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {activeProject.projectName ? `${activeProject.projectName} is in focus.` : "I’m ready to help."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setOpen(false)}
                >
                  Close
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close Zentrixa">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-3 flex shrink-0 flex-wrap gap-2">
              {QUICK_COMMANDS.map((command) => (
                <Button
                  key={command}
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="rounded-full"
                  onClick={() => quickFill(command)}
                >
                  {command}
                </Button>
              ))}
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full pr-3">
                <div className="space-y-3 pb-2">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={cn("flex items-end gap-2", message.role === "user" ? "justify-end" : "justify-start")}
                  >
                    {message.role === "assistant" && (
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-[10px]">ZX</AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      )}
                    >
                      {message.content}
                    </div>
                    {message.role === "user" && (
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-[10px]">
                          {user?.firstName?.charAt(0) || "Y"}
                          {user?.lastName?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {isThinking && (
                  <div className="flex items-end gap-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-[10px]">ZX</AvatarFallback>
                    </Avatar>
                    <div className="max-w-[82%] rounded-2xl bg-muted text-foreground">
                      <ZentrixaTypingDots />
                    </div>
                  </div>
                )}

                {pendingConfirmation && (
                  <div className="rounded-2xl border border-primary/25 bg-primary/8 p-3 text-sm shadow-sm">
                    <div className="font-semibold text-foreground">Confirm action</div>
                    <p className="mt-1 text-sm text-muted-foreground">{pendingConfirmation.message}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-full"
                        onClick={() => void sendConfirmationDecision(true, "yes")}
                      >
                        Yes
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="rounded-full"
                        onClick={() => void sendConfirmationDecision(false, "cancel")}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {pendingCommand && !pendingConfirmation && (
                  <div className="rounded-2xl border border-border/70 bg-muted/45 p-3 text-sm">
                    <div className="font-semibold text-foreground">Need one more detail</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Zentrixa is waiting on the missing part of your last command. Just reply naturally and I’ll continue.
                    </p>
                  </div>
                )}

                <div ref={endRef} />
                </div>
              </ScrollArea>
            </div>

            <div className="mt-3 shrink-0 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSend(input);
                    }
                  }}
                  placeholder={pendingConfirmation ? "Reply yes to confirm or cancel" : "Try: assign task login page to John"}
                  className="h-11 rounded-2xl"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className={cn("h-11 w-11 rounded-2xl transition-transform", isListening && "zentrixa-listening")}
                  onClick={startVoice}
                  aria-label="Toggle voice input"
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  className="h-11 rounded-2xl px-4"
                  onClick={() => void handleSend(input)}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{supported ? "Voice ready" : "Voice not supported"}</span>
                <span>{pendingConfirmation ? "Waiting on confirmation" : pendingCommand ? "Waiting on follow-up" : "Ready"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        type="button"
        size="lg"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "zentrixa-orb relative z-50 h-14 rounded-full border border-border/50 bg-[linear-gradient(135deg,rgba(161,111,61,0.98),rgba(92,59,31,0.98))] px-4 shadow-xl shadow-[rgba(92,59,31,0.22)] ring-1 ring-white/10 transition-[transform,box-shadow,background-color,filter] duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-2xl active:translate-y-0 active:scale-[0.98] sm:px-5",
          open && "bg-[linear-gradient(135deg,rgba(108,72,40,0.98),rgba(74,49,27,0.98))]"
        )}
        aria-label="Toggle Zentrixa assistant"
      >
        <span className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/12 ring-1 ring-white/15">
          {open ? <X className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </span>
        <span className="hidden text-sm font-semibold tracking-wide sm:inline">
          {open ? "Close Zentrixa" : "Ask Zentrixa"}
        </span>
      </Button>
    </div>
  );
}
