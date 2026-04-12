"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, Mic, MicOff, Send, Sparkles, WandSparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  dispatchZentrixaCommand,
  parseZentrixaCommand,
  summarizeParsedCommand,
  type ZentrixaContext,
  type ZentrixaParsedCommand,
} from "@/lib/zentrixa-api";
import { useVoiceRecognition } from "@/hooks/use-voice-recognition";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-context";

type AssistantMessage = {
  role: "assistant" | "user" | "system";
  content: string;
};

type DeleteCandidate = {
  id: string;
  title: string;
  projectName?: string;
  status?: string;
};

type CreateTaskFollowUp = {
  taskId?: string;
  taskName: string;
  projectName?: string;
  projectId?: string;
};

const ACTION_LABELS: Record<string, string> = {
  create_project: "Create project",
  create_task: "Create task",
  assign_task: "Assign task",
  move_task: "Move task",
  delete_task: "Delete task",
  delete_project: "Delete project",
  show_delayed: "Show delayed",
  update_deadline: "Update deadline",
  add_member: "Add member",
  analyze_project: "Analyze project",
};

function getConfidenceLabel(confidence: number | null | undefined) {
  if (typeof confidence !== "number") return "n/a";
  return `${Math.round(confidence * 100)}%`;
}

function getStatusLabel(status?: string | null) {
  if (!status) return null;
  if (status === "pending") return "To Do";
  if (status === "in-progress") return "In Progress";
  if (status === "review") return "Review";
  if (status === "completed") return "Done";
  return status;
}

export function ZentrixaAssistant({ context }: { context?: ZentrixaContext }) {
  const { user } = useAuth();
  const { getProjectById } = useData();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsedCommand, setParsedCommand] = useState<ZentrixaParsedCommand | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DeleteCandidate | null>(null);
  const [createFollowUp, setCreateFollowUp] = useState<CreateTaskFollowUp | null>(null);
  const [followUpMode, setFollowUpMode] = useState<"assignee" | "deadline" | null>(null);
  const [deadlineDraft, setDeadlineDraft] = useState("");
  const [pendingText, setPendingText] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: "assistant",
      content: "I’m Zentrixa. Type a command or use the microphone to parse a workspace action.",
    },
  ]);
  const endRef = useRef<HTMLDivElement | null>(null);
  const assistantShellRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom();
    }
  }, [open, messages.length]);

  const handleParseCommand = async (text: string) => {
    const cleaned = text.trim();
    if (!cleaned || loading) return;

    setPendingDelete(null);
    setCreateFollowUp(null);
    setFollowUpMode(null);
    setDeadlineDraft("");
    setPendingText(cleaned);
    setInput("");
    setLoading(true);
    setMessages((current) => [
      ...current,
      { role: "user", content: cleaned },
      { role: "assistant", content: "Parsing command..." },
    ]);

    try {
      const parsed = await parseZentrixaCommand(cleaned);
      setParsedCommand(parsed);

      const label = ACTION_LABELS[parsed.action] || "Unknown action";
      const summary = summarizeParsedCommand(parsed);

      setMessages((current) => [
        ...current.slice(0, -1),
        {
          role: "assistant",
          content: `${label} parsed. ${summary}`,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to parse command";
      setMessages((current) => [
        ...current.slice(0, -1),
        {
          role: "assistant",
          content: message,
        },
      ]);
      toast.error(message);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleExecute = async () => {
    if (!parsedCommand || loading || parsedCommand.action === "unknown") return;

    setLoading(true);
    try {
      const result = await dispatchZentrixaCommand({
        action: parsedCommand.action,
        text: pendingText || input || summarizeParsedCommand(parsedCommand),
        confidence: parsedCommand.confidence ?? 0,
        task_name: parsedCommand.task_name ?? undefined,
        project_name: parsedCommand.project_name ?? undefined,
        user_name: parsedCommand.user_name ?? undefined,
        status: parsedCommand.status ?? undefined,
        context,
        taskId: pendingDelete?.id,
        confirmed: Boolean(pendingDelete),
      });

      if (result.requiresConfirmation && result.candidates?.length) {
        setPendingDelete(result.candidates[0] as DeleteCandidate);
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: result.message || "I need confirmation before deleting this task.",
          },
        ]);
        return;
      }

      const createdTask = result.task && typeof result.task === "object" ? result.task : null;
      const createdTaskData = createdTask as Record<string, any> | null;
      const createdTaskName =
        createdTaskData && typeof createdTaskData.title === "string"
          ? createdTaskData.title
          : parsedCommand.task_name || "task";
      const createdProjectName =
        createdTaskData && typeof createdTaskData.projectName === "string"
          ? createdTaskData.projectName
          : parsedCommand.project_name || undefined;
      const createdStatus =
        createdTaskData && typeof createdTaskData.status === "string"
          ? createdTaskData.status
          : undefined;
      const createdTaskId =
        createdTaskData && typeof createdTaskData.id === "string"
          ? createdTaskData.id
          : typeof createdTaskData?._id === "string"
            ? createdTaskData._id
            : undefined;
      const createdProjectId =
        (result.projectId && String(result.projectId)) ||
        (createdTaskData && typeof createdTaskData.projectId === "string"
          ? createdTaskData.projectId
          : typeof createdTaskData?.projectId?._id === "string"
            ? createdTaskData.projectId._id
            : typeof createdTaskData?.projectId?.toString === "function"
              ? createdTaskData.projectId.toString()
              : undefined);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            result.message ||
            (parsedCommand.action === "create_task"
              ? `Task "${createdTaskName}" created${createdProjectName ? ` in ${createdProjectName}` : ""}.${createdStatus ? ` Status: ${getStatusLabel(createdStatus) || createdStatus}.` : ""}`
              : "Command executed."),
        },
      ]);

      if (parsedCommand.action === "create_task") {
        setCreateFollowUp({
          taskId: createdTaskId,
          taskName: createdTaskName,
          projectName: createdProjectName,
          projectId: createdProjectId,
        });
        setFollowUpMode(null);
        setDeadlineDraft("");
      } else {
        setCreateFollowUp(null);
        setFollowUpMode(null);
        setDeadlineDraft("");
      }

      setPendingDelete(null);
      setPendingText("");
      setParsedCommand(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to execute command";
      toast.error(message);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: message,
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const { supported, isListening, error, startListening, stopListening } = useVoiceRecognition({
    onFinalResult: async (text) => {
      setInput(text);
      await handleParseCommand(text);
    },
  });

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && assistantShellRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open]);

  const parsedCard = useMemo(() => {
    if (!parsedCommand) return null;

    const confidence = getConfidenceLabel(parsedCommand.confidence);
    const label = ACTION_LABELS[parsedCommand.action] || "Unknown action";

    return (
      <div className="rounded-2xl border border-border/70 bg-muted/70 p-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-foreground">Parsed command</div>
            <p className="text-xs text-muted-foreground">
              {label} {confidence !== "n/a" ? `• confidence ${confidence}` : ""}
            </p>
          </div>
          <WandSparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="mt-3 space-y-1 text-xs text-foreground">
          <div>action: {parsedCommand.action}</div>
          {parsedCommand.task_name ? <div>task: {parsedCommand.task_name}</div> : null}
          {parsedCommand.project_name ? <div>project: {parsedCommand.project_name}</div> : null}
          {parsedCommand.user_name ? <div>user: {parsedCommand.user_name}</div> : null}
          {parsedCommand.status ? <div>status: {parsedCommand.status}</div> : null}
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => void handleExecute()}
            disabled={loading || parsedCommand.action === "unknown"}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : pendingDelete ? (
              "Confirm delete"
            ) : (
              "Execute"
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setParsedCommand(null);
              setPendingDelete(null);
              setPendingText("");
              toast("Command cleared");
            }}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }, [loading, parsedCommand]);

  const projectForFollowUp = createFollowUp?.projectId
    ? getProjectById(createFollowUp.projectId)
    : context?.projectId
      ? getProjectById(context.projectId)
      : undefined;

  const assigneeSuggestions = useMemo(() => {
    if (!projectForFollowUp?.members?.length) return [];

    return projectForFollowUp.members
      .filter((member) => member.user.id !== user?.id)
      .slice(0, 3);
  }, [projectForFollowUp, user?.id]);

  const handleQuickAssign = async (memberName: string) => {
    if (!createFollowUp?.taskName || loading) return;

    setLoading(true);
    try {
      const result = await dispatchZentrixaCommand({
        action: "assign_task",
        text: `assign task ${createFollowUp.taskName} to ${memberName}`,
        confidence: 1,
        task_name: createFollowUp.taskName,
        user_name: memberName,
        taskId: createFollowUp.taskId,
        projectId: createFollowUp.projectId,
        context,
      });

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: result.message || `Assigned "${createFollowUp.taskName}" to ${memberName}.`,
        },
      ]);
      setFollowUpMode(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to assign task";
      toast.error(message);
      setMessages((current) => [...current, { role: "assistant", content: message }]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleSaveDeadline = async () => {
    if (!createFollowUp?.taskName || !deadlineDraft || loading) return;

    setLoading(true);
    try {
      const result = await dispatchZentrixaCommand({
        action: "update_deadline",
        text: `update deadline for ${createFollowUp.taskName} to ${deadlineDraft}`,
        confidence: 1,
        task_name: createFollowUp.taskName,
        deadline: deadlineDraft,
        taskId: createFollowUp.taskId,
        projectId: createFollowUp.projectId,
        context,
      });

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: result.message || `Deadline updated for "${createFollowUp.taskName}".`,
        },
      ]);
      setFollowUpMode(null);
      setDeadlineDraft("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update deadline";
      toast.error(message);
      setMessages((current) => [...current, { role: "assistant", content: message }]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const followUpCard = useMemo(() => {
    if (!createFollowUp) return null;

    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold text-foreground">Task created</div>
            <p className="text-xs text-muted-foreground">
              Would you like to add more people to "{createFollowUp.taskName}"?
            </p>
          </div>
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setFollowUpMode("assignee");
            }}
          >
            Add more people
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setFollowUpMode("deadline");
            }}
          >
            Set deadline
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
              onClick={() => {
                setMessages((current) => [
                  ...current,
                  {
                    role: "assistant",
                  content: `No problem. "${createFollowUp.taskName}" stays as To Do for now.`,
                },
                ]);
                setCreateFollowUp(null);
                setFollowUpMode(null);
                setDeadlineDraft("");
              }}
            >
            Not now
          </Button>
        </div>

        {followUpMode === "assignee" && (
          <div className="mt-3 space-y-2 rounded-xl border border-border/70 bg-background p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Choose someone to assign "{createFollowUp.taskName}" to:
            </p>
            <div className="flex flex-wrap gap-2">
              {assigneeSuggestions.length > 0 ? (
                assigneeSuggestions.map((member) => (
                  <Button
                    key={member.user.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleQuickAssign(`${member.user.firstName} ${member.user.lastName}`.trim())}
                  >
                    {member.user.firstName} {member.user.lastName}
                  </Button>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">
                  No other project members found. Invite someone first, or type a name to assign later.
                </p>
              )}
            </div>
          </div>
        )}

        {followUpMode === "deadline" && (
          <div className="mt-3 space-y-2 rounded-xl border border-border/70 bg-background p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Set a deadline for "{createFollowUp.taskName}":
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="date"
                value={deadlineDraft}
                onChange={(event) => setDeadlineDraft(event.target.value)}
                className="h-10 rounded-xl"
              />
              <Button type="button" size="sm" onClick={() => void handleSaveDeadline()} disabled={!deadlineDraft || loading}>
                Save deadline
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }, [assigneeSuggestions, createFollowUp, deadlineDraft, followUpMode, handleQuickAssign, handleSaveDeadline, loading]);

  return (
    <div ref={assistantShellRef} className="fixed bottom-4 right-4 left-auto z-50 sm:bottom-6 sm:right-6">
      {open && (
        <Card className="zentrixa-panel absolute bottom-16 right-0 mb-3 w-[min(calc(100vw-2rem),28rem)] origin-bottom-right border-border/70 bg-card/90 shadow-2xl backdrop-blur-xl transform-gpu sm:bottom-18 sm:w-[min(92vw,26rem)]">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="zentrixa-orb flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  Zentrixa
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">Natural language command parser</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close Zentrixa">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <CardContent className="space-y-4 px-4 py-4">
            <ScrollArea className="h-[22rem] pr-3">
              <div className="space-y-3">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={cn(
                      "max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      message.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : message.role === "system"
                          ? "mx-auto bg-muted text-muted-foreground"
                          : "bg-muted text-foreground",
                    )}
                  >
                    {message.content}
                  </div>
                ))}
                <div ref={endRef} />
              </div>
            </ScrollArea>

            {parsedCard}
            {followUpCard}

            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleParseCommand(input);
                  }
                }}
                placeholder="Try: create task login page in alpha"
                className="h-11 rounded-2xl"
              />
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className={cn("h-11 w-11 rounded-2xl transition-transform", isListening && "zentrixa-listening")}
                onClick={() => {
                  if (!supported) {
                    toast.error("Voice input is not supported in this browser.");
                    return;
                  }
                  if (isListening) {
                    stopListening();
                    return;
                  }
                  startListening();
                }}
                aria-label="Toggle voice input"
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                className="h-11 rounded-2xl px-4"
                onClick={() => void handleParseCommand(input)}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{supported ? "Voice ready" : "Voice not supported"}</span>
              <span>{loading ? "Parsing command..." : "Ready"}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        type="button"
        size="lg"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "zentrixa-orb h-14 rounded-full border border-border/50 bg-[linear-gradient(135deg,rgba(161,111,61,0.98),rgba(92,59,31,0.98))] px-4 shadow-xl shadow-[rgba(92,59,31,0.22)] ring-1 ring-white/10 transition-[transform,box-shadow,background-color,filter] duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-2xl active:translate-y-0 active:scale-[0.98] sm:px-5",
          open && "bg-[linear-gradient(135deg,rgba(108,72,40,0.98),rgba(74,49,27,0.98))]",
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
