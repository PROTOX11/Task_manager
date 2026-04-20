"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VoiceActionStatus =
  | "idle"
  | "matching"
  | "executing"
  | "done"
  | "fallback"
  | "error";

export interface VoiceActionResult {
  action: string | null;
  executed: boolean;
  message: string;
  data?: unknown;
  isFallback: boolean;
}

export interface UseVoiceActionOptions {
  onActionExecuted?: (result: VoiceActionResult) => void;
  onFallback?: (result: VoiceActionResult) => void;
  onError?: (message: string) => void;
  context?: Record<string, unknown>;
  debounceMs?: number;
}

// ─── Command keywords stripped when extracting the entity name ───────────────
//     e.g. "create project by name of Foo" → strip everything before the name

const COMMAND_PREFIX_RE =
  /^(?:please\s+)?(?:create|add|make|new|start|build|delete|remove|erase|trash|rename|move|assign|update|edit|change|analyze|analyse|show|list|invite|add|kick|comment|note|reschedule|shift|transfer)\s+/i;

const ENTITY_KEYWORD_RE =
  /\b(?:project|task|panel|column|board|member|user|person|developer|teammate)\b\s*/gi;

// Anchor keywords that immediately precede the actual name
const NAME_ANCHOR_RE =
  /\b(?:named?|called|titled|title|by\s+name\s+of|by\s+name|with\s+name|name)\s+/i;

// Stop words that delimit the name (everything after these is NOT the name)
const NAME_STOP_RE =
  /\s+(?:in|for|to|from|with|and|by|on|at|of)\b.*$/i;

/**
 * extractName("create project by name of Sasang") → "Sasang"
 * extractName("create project called My App in workspace") → "My App"
 * extractName("create project foo bar") → "foo bar"  (fallback)
 */
function extractName(raw: string, action: string): string {
  let text = raw.trim();

  // 1. Try anchor keyword ("name of X", "called X", "named X", etc.)
  const anchorMatch = NAME_ANCHOR_RE.exec(text);
  if (anchorMatch) {
    let after = text.slice(anchorMatch.index + anchorMatch[0].length).trim();
    after = after.replace(NAME_STOP_RE, "").trim();
    if (after) return after;
  }

  // 2. Strip command verb (create / delete / …)
  text = text.replace(COMMAND_PREFIX_RE, "").trim();

  // 3. Strip entity noun (project / task / panel / …)
  text = text.replace(ENTITY_KEYWORD_RE, "").trim();

  // 4. Strip trailing context ("in workspace", "for team", …)
  text = text.replace(NAME_STOP_RE, "").trim();

  return text;
}

// ─── Filler words stripped ONLY for intent matching (not name extraction) ─────

const FILLER_RE =
  /\b(um+|uh+|like|you know|so|well|basically|literally|actually|okay|ok|right|please|hey|zentrixa|could you|can you|i want to|i need to|i would like to|would you|go ahead and)\b/gi;

// ─── Intent rules ─────────────────────────────────────────────────────────────

type IntentRule = {
  action: string;
  verbs: string[];    // one of these must appear
  entities: string[]; // one of these must also appear
};

const INTENT_RULES: IntentRule[] = [
  { action: "create_project",  verbs: ["create","add","new","start","build","make"],                         entities: ["project"] },
  { action: "delete_project",  verbs: ["delete","remove","destroy","erase","drop"],                          entities: ["project"] },
  { action: "rename_project",  verbs: ["rename","change name","update name","retitle"],                      entities: ["project"] },
  { action: "analyze_project", verbs: ["analyze","analyse","summary","summarize","health","status","overview"], entities: ["project"] },
  { action: "create_task",     verbs: ["create","add","new","make"],                                         entities: ["task"] },
  { action: "delete_task",     verbs: ["delete","remove","cancel","trash","erase"],                          entities: ["task"] },
  { action: "rename_task",     verbs: ["rename","retitle","change name"],                                    entities: ["task"] },
  { action: "update_task",     verbs: ["update","edit","modify","change"],                                   entities: ["task"] },
  { action: "assign_task",     verbs: ["assign","give","delegate","connect"],                                entities: ["task","user"] },
  { action: "move_task",       verbs: ["move","shift","transfer","change status"],                           entities: ["task"] },
  { action: "update_status",   verbs: ["update status","set status","mark","change status"],                 entities: ["task"] },
  { action: "update_priority", verbs: ["update priority","set priority","change priority","prioritize"],     entities: ["task"] },
  { action: "show_delayed",    verbs: ["show","list","get","find","display"],                                entities: ["overdue","delayed","late"] },
  { action: "add_member",      verbs: ["add","invite","include"],                                            entities: ["member","user","person","developer","teammate"] },
  { action: "remove_member",   verbs: ["remove","kick","exclude","uninvite"],                                entities: ["member","user","person","developer","teammate"] },
  { action: "comment_task",    verbs: ["comment","note","reply","add comment"],                              entities: ["task"] },
  { action: "update_deadline", verbs: ["update deadline","set deadline","change deadline","reschedule"],     entities: ["task","deadline","due date"] },
  { action: "create_panel",    verbs: ["create","add","new"],                                                entities: ["panel","column","board"] },
];

// ─── Structured entities sent to backend ─────────────────────────────────────

interface ExtractedEntities {
  project_name?: string;
  task_name?: string;
  user_name?: string;
  status?: string;
  priority?: string;
  deadline?: string;
}

const STATUS_MAP: Record<string, string> = {
  "todo": "pending", "to do": "pending", "pending": "pending",
  "in progress": "in-progress", "progress": "in-progress", "doing": "in-progress",
  "review": "review",
  "done": "completed", "completed": "completed", "complete": "completed",
};

function extractEntities(raw: string, action: string): ExtractedEntities {
  const result: ExtractedEntities = {};
  const lower = raw.toLowerCase();

  // ── Name (project or task) ──────────────────────────────────────────────────
  // Uses the smart extractName() to avoid full-sentence mis-capture
  if (action.includes("project")) {
    result.project_name = extractName(raw, action);
  } else if (action.includes("task") || action.includes("panel")) {
    result.task_name = extractName(raw, action);
  }

  // ── User / assignee: "to John", "for Sara", "assign to Ahmed" ───────────────
  const userMatch =
    /\b(?:to|for|assign(?:ed)?\s+to|user)\s+([A-Za-z][A-Za-z0-9 _-]{1,30?})(?:\s+(?:in|from|to|on|at)|$)/i.exec(raw);
  if (userMatch) result.user_name = userMatch[1].trim();

  // ── Status ──────────────────────────────────────────────────────────────────
  for (const [alias, canonical] of Object.entries(STATUS_MAP)) {
    if (lower.includes(alias)) { result.status = canonical; break; }
  }

  // ── Priority ────────────────────────────────────────────────────────────────
  if (/\b(high priority|urgent)\b/i.test(raw)) result.priority = "high";
  else if (/\blow priority\b/i.test(raw)) result.priority = "low";
  else if (/\bmedium priority\b/i.test(raw)) result.priority = "medium";

  // ── Deadline / date ─────────────────────────────────────────────────────────
  const dateMatch =
    /\b(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:\s*,?\s*\d{4})?|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month))\b/i.exec(raw);
  if (dateMatch) result.deadline = dateMatch[0];

  return result;
}

// ─── Clean text for intent matching only ─────────────────────────────────────

function cleanForIntentMatch(raw: string): string {
  return raw
    .toLowerCase()
    .replace(FILLER_RE, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ─── Strict intent matcher ────────────────────────────────────────────────────

function matchIntent(
  cleaned: string,
  allowedActions: string[]
): { action: string; entities: ExtractedEntities; rawText: string } | null {
  for (const rule of INTENT_RULES) {
    if (!allowedActions.includes(rule.action)) continue;

    const verbHit = rule.verbs.some((verb) =>
      new RegExp(`\\b${verb.replace(/\s+/g, "\\s+")}\\b`, "i").test(cleaned)
    );
    if (!verbHit) continue;

    const entityHit = rule.entities.some((ent) =>
      new RegExp(`\\b${ent}\\b`, "i").test(cleaned)
    );
    if (!entityHit) continue;

    return {
      action: rule.action,
      entities: extractEntities(cleaned, rule.action),
      rawText: cleaned,
    };
  }
  return null;
}

// ─── Dedup key ────────────────────────────────────────────────────────────────

function dedupeKey(action: string, entities: ExtractedEntities): string {
  return `${action}::${JSON.stringify(entities)}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceAction(options: UseVoiceActionOptions = {}) {
  const {
    onActionExecuted,
    onFallback,
    onError,
    context = {},
    debounceMs = 300,
  } = options;

  const [status, setStatus] = useState<VoiceActionStatus>("idle");
  const [lastResult, setLastResult] = useState<VoiceActionResult | null>(null);

  const allowedActionsRef   = useRef<string[]>([]);
  const debounceTimerRef    = useRef<number | null>(null);
  const lastDedupeKeyRef    = useRef<string>("");
  const isProcessingRef     = useRef(false);

  // Stable refs for callbacks and context (avoids stale closure)
  const onActionExecutedRef = useRef(onActionExecuted);
  const onFallbackRef       = useRef(onFallback);
  const onErrorRef          = useRef(onError);
  const contextRef          = useRef(context);

  useEffect(() => { onActionExecutedRef.current = onActionExecuted; }, [onActionExecuted]);
  useEffect(() => { onFallbackRef.current       = onFallback;       }, [onFallback]);
  useEffect(() => { onErrorRef.current          = onError;          }, [onError]);
  useEffect(() => { contextRef.current          = context;          }, [context]);

  // ── Fetch allowed actions from backend once ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    apiRequest<string[]>("/zentrixa/actions")
      .then((actions) => {
        if (!cancelled && Array.isArray(actions)) {
          allowedActionsRef.current = actions;
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Offline fallback — mirrors the /actions endpoint list
          allowedActionsRef.current = [
            "create_project","delete_project","rename_project","analyze_project",
            "create_task","delete_task","assign_task","move_task","update_task",
            "comment_task","show_delayed","add_member","remove_member",
            "update_deadline","create_panel",
          ];
        }
      });
    return () => { cancelled = true; };
  }, []);

  // ── Fallback → AI chat ───────────────────────────────────────────────────────
  const executeFallback = useCallback(async (rawText: string) => {
    setStatus("fallback");
    try {
      const res = await apiRequest<{ reply?: string; message?: string }>(
        "/zentrixa/chat",
        {
          method: "POST",
          body: JSON.stringify({
            message: rawText,
            text: rawText,
            context: contextRef.current,
          }),
        }
      );
      const message = res.reply || res.message || rawText;
      const result: VoiceActionResult = { action: null, executed: false, message, isFallback: true };
      setLastResult(result);
      setStatus("done");
      onFallbackRef.current?.(result);
    } catch {
      // Even on network error show the original transcript
      const result: VoiceActionResult = { action: null, executed: false, message: rawText, isFallback: true };
      setLastResult(result);
      setStatus("done");
      onFallbackRef.current?.(result);
    }
  }, []);

  // ── Execute a matched backend action ─────────────────────────────────────────
  const executeAction = useCallback(async (
    action: string,
    entities: ExtractedEntities,
    rawText: string
  ) => {
    setStatus("executing");
    try {
      const res = await apiRequest<{ executed?: boolean; message?: string; reply?: string; data?: unknown }>(
        "/zentrixa/dispatch",
        {
          method: "POST",
          body: JSON.stringify({
            action,
            intent: action,
            text: rawText,
            entities,
            context: contextRef.current,
            projectId: contextRef.current.projectId,
            taskId: contextRef.current.taskId,
          }),
        }
      );
      const result: VoiceActionResult = {
        action,
        executed: Boolean(res.executed),
        message: res.message || res.reply || `${action.replace(/_/g, " ")} done.`,
        data: res.data,
        isFallback: false,
      };
      setLastResult(result);
      setStatus("done");
      onActionExecutedRef.current?.(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Action failed.";
      onErrorRef.current?.(msg);
      setStatus("error");
    }
  }, []);

  // ── Main entry point ─────────────────────────────────────────────────────────
  const processTranscript = useCallback((rawTranscript: string) => {
    if (!rawTranscript.trim() || isProcessingRef.current) return;

    // Debounce: cancel any pending timer and restart
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(async () => {
      debounceTimerRef.current = null;

      const cleaned = cleanForIntentMatch(rawTranscript);
      if (!cleaned) return;

      setStatus("matching");
      isProcessingRef.current = true;

      try {
        const match = matchIntent(cleaned, allowedActionsRef.current);

        if (!match) {
          // No action matched → AI fallback
          await executeFallback(rawTranscript.trim());
          return;
        }

        // Dedup: skip if action + extracted entities are identical to last call
        const key = dedupeKey(match.action, match.entities);
        if (key === lastDedupeKeyRef.current) return;
        lastDedupeKeyRef.current = key;

        await executeAction(match.action, match.entities, rawTranscript.trim());
      } finally {
        isProcessingRef.current = false;
      }
    }, debounceMs);
  }, [debounceMs, executeFallback, executeAction]);

  const reset = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    isProcessingRef.current = false;
    lastDedupeKeyRef.current = "";
    setStatus("idle");
    setLastResult(null);
  }, []);

  useEffect(() => () => {
    if (debounceTimerRef.current !== null) window.clearTimeout(debounceTimerRef.current);
  }, []);

  return {
    status,
    lastResult,
    processTranscript,
    allowedActions: allowedActionsRef.current,
    reset,
  };
}
