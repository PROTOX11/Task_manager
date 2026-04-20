"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Loader2, Mic, MicOff, Pencil, Save, Send, Square, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useVoiceRecognition } from "@/hooks/use-voice-recognition";
import { useVoiceAction } from "@/hooks/use-voice-action";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-context";
import {
  playZentrixaListeningCue,
  playZentrixaReplyCue,
  playZentrixaThinkingCue,
} from "@/lib/notification-sounds";
import {
  type ZentrixaContext,
  confirmZentrixaCommand,
  getZentrixaMessages,
  sendZentrixaChat,
} from "@/lib/zentrixa-api";
import { ZentrixaAiRing } from "./ZentrixaAiRing";
import { ZentrixaTypingDots } from "./ZentrixaTyping";

type Message = { role: "assistant" | "user"; content: string };
type ProjectLookup = (id: string) => { name?: string } | undefined;
type ZentrixaAiMode = "thinking" | "listening" | "replying" | null;
type PendingConfirmation = {
  command: string;
  message: string;
  payload: Record<string, unknown>;
};

type DeveloperOption = {
  id: string;
  name: string;
  email: string;
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
  const [aiMode, setAiMode] = useState<ZentrixaAiMode>(null);
  const [pendingCommand, setPendingCommand] = useState<Record<string, unknown> | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [confirmationEditMode, setConfirmationEditMode] = useState(false);
  const [confirmationDraftTitle, setConfirmationDraftTitle] = useState("");
  const [confirmationDraftDescription, setConfirmationDraftDescription] = useState("");
  const [confirmationDescriptionEditMode, setConfirmationDescriptionEditMode] = useState(false);
  const [developers, setDevelopers] = useState<DeveloperOption[]>([]);
  const [developerSearch, setDeveloperSearch] = useState("");
  const [selectedDeveloperId, setSelectedDeveloperId] = useState("");
  const [loadingDevelopers, setLoadingDevelopers] = useState(false);

  const shellRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const openFrameRef = useRef<number | null>(null);
  const replyModeTimerRef = useRef<number | null>(null);
  const pendingResponseRef = useRef(false);
  const voiceSessionRef = useRef(false);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startListeningRef = useRef<(() => void) | null>(null);

  const routeProjectId = useMemo(() => {
    const match = pathname?.match(/^\/projects\/([^/?#]+)/);
    return match?.[1];
  }, [pathname]);

  const activeProject = useMemo(
    () => buildProjectContext(context, routeProjectId, getProjectById),
    [context, getProjectById, routeProjectId]
  );

  const clearReplyModeTimer = () => {
    if (replyModeTimerRef.current !== null) {
      window.clearTimeout(replyModeTimerRef.current);
      replyModeTimerRef.current = null;
    }
  };

  const showReplyModeBriefly = () => {
    clearReplyModeTimer();
    setAiMode("replying");
    replyModeTimerRef.current = window.setTimeout(() => {
      setAiMode((current) => (current === "replying" ? null : current));
      replyModeTimerRef.current = null;
    }, 900);
  };

  const stopSpeaking = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    speechUtteranceRef.current = null;
  };

  const speakReply = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const cleaned = text.trim();
    if (!cleaned) return;

    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    speechUtteranceRef.current = utterance;
    utterance.onend = () => {
      if (speechUtteranceRef.current === utterance) {
        speechUtteranceRef.current = null;
      }
      /* After Zentrixa finishes speaking, auto-restart listening
         so the conversation continues until user switches to chat */
      if (voiceSessionRef.current) {
        window.setTimeout(() => {
          if (voiceSessionRef.current) {
            try {
              startListeningRef.current?.();
            } catch {
              voiceSessionRef.current = false;
              setAiMode(null);
            }
          }
        }, 400);
      }
    };
    window.speechSynthesis.speak(utterance);
  };

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

  const sendConfirmationDecision = async (
    confirmed: boolean,
    label: string,
    payloadOverride?: Record<string, unknown>
  ) => {
    if (!pendingConfirmation || !user) return;
    const payload = payloadOverride || pendingConfirmation.payload;

    setLoading(true);
    setIsThinking(true);
    setAiMode("thinking");
    pendingResponseRef.current = true;
    setMessages((current) => [...current, { role: "user", content: label }]);

    try {
      const result = await confirmZentrixaCommand({
        confirmed,
        text: label,
        payload,
        context: {
          ...context,
          ...activeProject,
          pendingCommand,
        },
      });

      playZentrixaReplyCue();
      await new Promise((resolve) => window.setTimeout(resolve, 100));
      showReplyModeBriefly();
      const replyText = result.reply || result.message || "I’m here with you.";
      postAssistantMessage(replyText);
      if (voiceSessionRef.current) {
        speakReply(replyText);
        /* Don't reset voiceSessionRef here – keep voice mode active
           so the utterance.onend handler will re-start listening */
      }
      setPendingConfirmation(null);
      setPendingCommand(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "I couldn’t complete that.";
      postAssistantMessage(message);
      toast.error(message);
    } finally {
      setIsThinking(false);
      setLoading(false);
      pendingResponseRef.current = false;
      scrollToBottom();
    }
  };

  useEffect(() => {
    if (!pendingConfirmation) {
      setConfirmationEditMode(false);
      setConfirmationDraftTitle("");
      setConfirmationDraftDescription("");
      setConfirmationDescriptionEditMode(false);
      setDevelopers([]);
      setDeveloperSearch("");
      setSelectedDeveloperId("");
      return;
    }

    const initialTitle = typeof pendingConfirmation.payload.title === "string" ? pendingConfirmation.payload.title : "";
    const initialDescription = typeof pendingConfirmation.payload.description === "string" ? pendingConfirmation.payload.description : "";
    setConfirmationDraftTitle(initialTitle);
    setConfirmationDraftDescription(initialDescription);
    setConfirmationEditMode(false);
    setConfirmationDescriptionEditMode(false);
  }, [pendingConfirmation]);

  useEffect(() => {
    if (!pendingConfirmation || String(pendingConfirmation.command || "").toUpperCase() !== "CREATE_TASK") return;

    let cancelled = false;
    const loadDevelopers = async () => {
      try {
        setLoadingDevelopers(true);
        const response = await apiRequest<{ developers: Array<any> }>("/auth/developers");
        if (cancelled) return;
        setDevelopers(
          (response.developers || []).map((developer) => ({
            id: (developer._id || developer.id).toString(),
            name: developer.name,
            email: developer.email,
          }))
        );
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Unable to load developers");
        }
      } finally {
        if (!cancelled) {
          setLoadingDevelopers(false);
        }
      }
    };

    void loadDevelopers();
    return () => {
      cancelled = true;
    };
  }, [pendingConfirmation]);

  const filteredDevelopers = useMemo(() => {
    const term = developerSearch.trim().toLowerCase();
    if (!term) return developers;
    return developers.filter((developer) => {
      const haystack = `${developer.name} ${developer.email}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [developers, developerSearch]);

  const applyConfirmationDraft = () => {
    if (!pendingConfirmation) return;
    const cleanedTitle = confirmationDraftTitle.trim();
    if (!cleanedTitle) {
      toast.error("Task name cannot be empty.");
      return;
    }

    setPendingConfirmation((current) => {
      if (!current) return current;
      return {
        ...current,
        message: current.command === "CREATE_TASK" && current.payload.projectName
          ? `Create task ${cleanedTitle} in ${String(current.payload.projectName)} and assign it to ${String(current.payload.userName || "someone")}?`
          : current.message,
        payload: {
          ...current.payload,
          title: cleanedTitle,
        },
      };
    });
    setConfirmationEditMode(false);
    toast.success("Task name updated.");
  };

  const applyConfirmationDescription = () => {
    if (!pendingConfirmation) return;
    const cleanedDescription = confirmationDraftDescription.trim();

    setPendingConfirmation((current) => {
      if (!current) return current;
      return {
        ...current,
        payload: {
          ...current.payload,
          description: cleanedDescription,
        },
      };
    });
    setConfirmationDescriptionEditMode(false);
    toast.success(cleanedDescription ? "Description saved." : "Description cleared.");
  };

  const buildCreateTaskPayload = () => {
    if (!pendingConfirmation) return null;

    const selectedDeveloper = developers.find((developer) => developer.id === selectedDeveloperId);
    return {
      ...pendingConfirmation.payload,
      description: confirmationDraftDescription.trim(),
      ...(selectedDeveloper
        ? {
            userId: selectedDeveloper.id,
            userName: selectedDeveloper.name,
          }
        : {
            userId: null,
            userName: null,
          }),
    };
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
    setAiMode("thinking");
    pendingResponseRef.current = true;
    setMessages((current) => [...current, { role: "user", content: cleaned }]);

    try {
      const result = await sendZentrixaChat({
        message: cleaned,
        context: {
          ...context,
          ...activeProject,
          pendingCommand,
        },
      });

      const reply = result.reply || result.message || "I’m here with you.";
      playZentrixaReplyCue();
      await new Promise((resolve) => window.setTimeout(resolve, 100));
      showReplyModeBriefly();
      postAssistantMessage(reply);
      if (voiceSessionRef.current) {
        speakReply(reply);
        /* Don't reset voiceSessionRef – keep voice mode active
           for continuous conversation */
      }

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

    } catch (error) {
      const message = error instanceof Error ? error.message : "I couldn’t understand that.";
      setMessages((current) => [...current, { role: "assistant", content: message }]);
      toast.error(message);
    } finally {
      setIsThinking(false);
      setLoading(false);
      pendingResponseRef.current = false;
      scrollToBottom();
    }
  };

  const { processTranscript, reset: resetVoiceAction } = useVoiceAction({
    context: activeProject as Record<string, unknown>,
    debounceMs: 300,
    onActionExecuted: (result) => {
      // Voice command executed → brief toast, no chatbot bubble
      setAiMode(null);
      voiceSessionRef.current = false;
      pendingResponseRef.current = false;
      setLoading(false);
      setIsThinking(false);
      playZentrixaReplyCue();
      toast.success(result.message, { duration: 4000 });
      // Restart listening for continuous voice session
      if (voiceSessionRef.current) {
        window.setTimeout(() => {
          try { startListeningRef.current?.(); } catch { /* ignore */ }
        }, 600);
      }
    },
    onFallback: (result) => {
      // Non-command voice → show AI reply in message list
      setAiMode(null);
      pendingResponseRef.current = false;
      setLoading(false);
      setIsThinking(false);
      playZentrixaReplyCue();
      postAssistantMessage(result.message);
      if (voiceSessionRef.current) speakReply(result.message);
    },
    onError: (msg) => {
      pendingResponseRef.current = false;
      voiceSessionRef.current = false;
      setLoading(false);
      setIsThinking(false);
      setAiMode(null);
      toast.error(msg);
    },
  });

  const { supported, isListening, isProcessing, isMuted, error, micScale, startListening, stopListening, toggleMute } = useVoiceRecognition({
    onStart: () => {
      setAiMode("listening");
      playZentrixaListeningCue();
    },
    onEnd: () => {
      // Recording stopped but transcription still running → switch ring to thinking
      playZentrixaThinkingCue();
      setAiMode("thinking");
    },
    onError: (message) => {
      pendingResponseRef.current = false;
      voiceSessionRef.current = false;
      resetVoiceAction();
      setAiMode(null);
      setIsThinking(false);
      setLoading(false);
      if (process.env.NODE_ENV !== "production") {
        console.debug("[Zentrixa voice]", message);
      }
    },
    onFinalResult: (text) => {
      // Voice path → strict action system (NOT handleSend / chatbot)
      setInput(text);
      setIsThinking(true);
      setLoading(true);
      pendingResponseRef.current = true;
      // Show what was heard as a user bubble
      setMessages((current) => [...current, { role: "user", content: text }]);
      processTranscript(text);
    },
  });

  /* Keep startListeningRef in sync so speakReply can call it */
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    if (!open && aiMode === "listening") {
      stopListening();
      setAiMode(null);
    }
  }, [aiMode, open, stopListening]);

  useEffect(() => {
    return () => {
      clearReplyModeTimer();
      pendingResponseRef.current = false;
      voiceSessionRef.current = false;
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, historyLoaded]);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [messages, isThinking, open, pendingCommand, pendingConfirmation, aiMode]);

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

    voiceSessionRef.current = true;
    stopSpeaking();
    setOpen(true);
    window.requestAnimationFrame(() => {
      try {
        startListening();
      } catch {
        voiceSessionRef.current = false;
        setAiMode(null);
        toast.error("Voice input could not start. Please try again.");
      }
    });
  };

  const stopVoice = () => {
    voiceSessionRef.current = false;
    pendingResponseRef.current = false;
    clearReplyModeTimer();
    stopSpeaking();
    stopListening();
    setAiMode(null);
  };

  // Show the animated AI ring when:
  //   - microphone is actively recording (isListening)
  //   - OR audio is being transcribed (isProcessing)
  // Hide it the moment neither is true (chat mode shows message list)
  const showAiRingInChat = voiceSessionRef.current && (isListening || isProcessing);
  const chatRingMode = isListening ? "listening" : "thinking";

  return (
    <div ref={shellRef} className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {mounted && (
        <Card
          data-state={open && panelVisible ? "open" : "closed"}
          className="zentrixa-panel absolute bottom-16 right-0 mb-3 flex h-[min(70vh,calc(100dvh-5.5rem))] w-[calc(100vw-1rem)] overflow-hidden rounded-[2rem] border border-white/20 bg-card/90 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-2xl transform-gpu will-change-transform sm:w-[400px]"
        >
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4">
            <div className="flex shrink-0 items-center justify-between border-b border-border/70 pb-3">
              <div className="flex min-w-0 items-center gap-3">
                <ZentrixaAiRing
                  mode={null}
                  size={64}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold tracking-tight text-foreground/90">Zentrixa</h3>
                    <Sparkles className="h-3.5 w-3.5 text-primary/80" />
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground/80">
                    {isThinking ? "Composing reply..." : loading ? "Processing..." : "Seamlessly active"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full transition-colors hover:bg-muted/50"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4 opacity-60" />
              </Button>
            </div>

            <div className="mt-3 flex shrink-0 flex-wrap gap-2">
              {QUICK_COMMANDS.map((command) => (
                <Button
                  key={command}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-full border-border/50 bg-background/50 px-3 text-[10px] font-medium transition-all hover:bg-background hover:shadow-sm"
                  onClick={() => quickFill(command)}
                >
                  {command}
                </Button>
              ))}
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-hidden">
              {showAiRingInChat ? (
                <div className="flex h-full items-center justify-center rounded-3xl border border-border/60 bg-[radial-gradient(circle_at_center,rgba(200,162,122,0.12),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.02))]">
                  <ZentrixaAiRing
                    mode={chatRingMode}
                    micScale={micScale}
                    size={176}
                  />
                </div>
              ) : (
                <ScrollArea className="h-full pr-3">
                  <div className="space-y-3 pb-2">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={cn("flex flex-col gap-1", message.role === "user" ? "items-end" : "items-start")}
                    >
                      <div className={cn("flex items-end gap-2", message.role === "user" ? "flex-row-reverse" : "flex-row")}>
                      {message.role === "assistant" && (
                        <Avatar className="h-7 w-7 shrink-0 border border-border/50">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">ZX</AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm font-medium leading-relaxed shadow-sm",
                          message.role === "user" 
                            ? "bg-primary text-primary-foreground rounded-tr-none" 
                            : "bg-muted/50 text-foreground rounded-tl-none border border-border/50 backdrop-blur-sm"
                        )}
                      >
                        {message.content}
                      </div>
                      {message.role === "user" && (
                        <Avatar className="h-7 w-7 shrink-0 border border-border/50">
                          <AvatarFallback className="text-[10px] bg-muted">
                            {user?.firstName?.charAt(0) || "Y"}
                            {user?.lastName?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </div>
                  ))}

                  {isThinking && (
                    <div className="flex items-end gap-2">
                      <Avatar className="h-7 w-7 shrink-0 border border-border/50">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">ZX</AvatarFallback>
                      </Avatar>
                      <div className="max-w-[82%] rounded-2xl bg-muted/50 border border-border/50 text-foreground">
                        <ZentrixaTypingDots />
                      </div>
                    </div>
                  )}

                  {pendingConfirmation && (
                    <div className="w-full max-w-[310px] rounded-2xl border border-primary/25 bg-primary/5 p-3 text-xs shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                          Confirm
                        </div>
                        {String(pendingConfirmation.command || "").toUpperCase() === "CREATE_TASK" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 rounded-full px-2 text-[10px]"
                            onClick={() => setConfirmationEditMode((value) => !value)}
                          >
                            <Pencil className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                        )}
                      </div>
                      {String(pendingConfirmation.command || "").toUpperCase() === "CREATE_TASK" && confirmationEditMode ? (
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            value={confirmationDraftTitle}
                            onChange={(event) => setConfirmationDraftTitle(event.target.value)}
                            className="h-9 rounded-2xl text-xs"
                            placeholder="Task name"
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-9 rounded-full px-3 text-xs"
                            onClick={applyConfirmationDraft}
                          >
                            <Save className="mr-1 h-3 w-3" />
                            Save
                          </Button>
                        </div>
                      ) : null}
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{pendingConfirmation.message}</p>
                      {String(pendingConfirmation.command || "").toUpperCase() === "CREATE_TASK" && (
                        <div className="mt-2 space-y-2 rounded-xl border border-border/60 bg-background/70 p-2">
                          <div className="rounded-lg border border-border/50 bg-background/80 p-1.5">
                            <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Have a description?
                            </div>
                            {confirmationDescriptionEditMode || confirmationDraftDescription ? (
                              <div className="space-y-1.5">
                                <Textarea
                                  value={confirmationDraftDescription}
                                  onChange={(event) => setConfirmationDraftDescription(event.target.value)}
                                  placeholder="Describe the task..."
                                  className="min-h-20 rounded-xl text-xs"
                                />
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-7 rounded-full px-3 text-[10px]"
                                    onClick={applyConfirmationDescription}
                                  >
                                    <Save className="mr-1 h-3 w-3" />
                                    Save
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    className="h-7 rounded-full px-3 text-[10px]"
                                    onClick={() => {
                                      setConfirmationDraftDescription("");
                                      setConfirmationDescriptionEditMode(false);
                                    }}
                                  >
                                    No description
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 rounded-full px-3 text-[10px]"
                                  onClick={() => setConfirmationDescriptionEditMode(true)}
                                >
                                  Yes
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 rounded-full px-3 text-[10px]"
                                  onClick={() => {
                                    setConfirmationDraftDescription("");
                                    setConfirmationDescriptionEditMode(false);
                                    toast.success("No description will be added. You can update it later.");
                                  }}
                                >
                                  No
                                </Button>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Assign someone?
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-6 rounded-full px-2 text-[10px]"
                                onClick={() => {
                                  setSelectedDeveloperId("");
                                  setDeveloperSearch("");
                                }}
                              >
                                Clear
                              </Button>
                            </div>
                            <Input
                              value={developerSearch}
                              onChange={(event) => setDeveloperSearch(event.target.value)}
                              placeholder="Search developers"
                              className="h-7 rounded-xl text-[10px]"
                            />
                            <div className="mt-1.5 max-h-24 overflow-auto rounded-xl border border-border/40 bg-background">
                              <button
                                type="button"
                                className={cn(
                                  "flex w-full items-center justify-between px-2 py-1 text-left text-[10px] transition-colors",
                                  !selectedDeveloperId && "bg-primary/10 text-foreground"
                                )}
                                onClick={() => setSelectedDeveloperId("")}
                              >
                                <span>No assignee</span>
                                <span className="text-muted-foreground">leave empty</span>
                              </button>
                              {loadingDevelopers ? (
                                <div className="px-2 py-1.5 text-[10px] text-muted-foreground">Loading developers...</div>
                              ) : filteredDevelopers.length > 0 ? (
                                filteredDevelopers.map((developer) => (
                                  <button
                                    key={developer.id}
                                    type="button"
                                    className={cn(
                                      "flex w-full items-center justify-between px-2 py-1 text-left text-[10px] transition-colors hover:bg-primary/10",
                                      selectedDeveloperId === developer.id && "bg-primary/15 text-foreground"
                                    )}
                                    onClick={() => setSelectedDeveloperId(developer.id)}
                                  >
                                    <span className="truncate">{developer.name}</span>
                                    <span className="ml-2 truncate text-[9px] text-muted-foreground">{developer.email}</span>
                                  </button>
                                ))
                              ) : (
                                <div className="px-2 py-1.5 text-[10px] text-muted-foreground">No developers found.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 rounded-full px-3 text-[10px]"
                          onClick={() => {
                            const payload = buildCreateTaskPayload();
                            if (!payload) return;
                            void sendConfirmationDecision(true, "yes", payload);
                          }}
                        >
                          Yes
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 rounded-full px-3 text-[10px]"
                          onClick={() => void sendConfirmationDecision(false, "cancel")}
                        >
                          Cancel
                        </Button>
                      </div>
                      {String(pendingConfirmation.command || "").toUpperCase() === "CREATE_TASK" && (
                        <div className="mt-2 rounded-xl bg-background/60 px-2.5 py-2 text-[10px] leading-relaxed text-muted-foreground">
                          <div>Task: {confirmationDraftTitle || String(pendingConfirmation.payload.title || "")}</div>
                          <div>Project: {String(pendingConfirmation.payload.projectName || "")}</div>
                          <div>Description: {confirmationDraftDescription.trim() || "none"}</div>
                          <div>Assign to: {selectedDeveloperId ? (developers.find((developer) => developer.id === selectedDeveloperId)?.name || "selected") : String(pendingConfirmation.payload.userName || "not set")}</div>
                        </div>
                      )}
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
              )}
            </div>

            <div className="mt-3 shrink-0 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-1.5 rounded-2xl border border-border/40 bg-background/40 px-3 py-1 focus-within:border-primary/30 focus-within:bg-background/60 transition-all shadow-inner">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask anything..."
                    className="h-8 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSend(input);
                      }
                    }}
                  />
                  <div className="flex items-center border-l border-border/30 pl-1.5 ml-1.5 italic text-[10px] text-muted-foreground/60 select-none">
                    Enter
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-11 w-11 rounded-2xl"
                  onClick={() => {
                    if (isListening || aiMode === "listening") {
                      toggleMute();
                    } else {
                      startVoice();
                    }
                  }}
                  aria-label={isListening ? (isMuted ? "Unmute microphone" : "Mute microphone") : "Start voice input"}
                >
                  {isListening ? (
                    isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  className="h-11 rounded-2xl px-4"
                  onClick={() => {
                    if (isListening) {
                      stopVoice();
                      return;
                    }
                    void handleSend(input);
                  }}
                  disabled={loading && !isListening}
                >
                  {isListening ? (
                    <Square className="h-4 w-4" />
                  ) : loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
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
