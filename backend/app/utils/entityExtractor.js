const STATUS_ALIASES = {
  todo: "pending",
  "to do": "pending",
  pending: "pending",
  "in progress": "in-progress",
  progress: "in-progress",
  doing: "in-progress",
  review: "review",
  done: "completed",
  completed: "completed",
  complete: "completed",
};

const clean = (value = "") => value.replace(/\s+/g, " ").trim().replace(/^["'.,!?]+|["'.,!?]+$/g, "");

const stripLeadingTokens = (value = "") =>
  clean(value).replace(/^(the|a|an|my|this|that)\s+/i, "").trim();

const takeUntil = (value = "", stopWords = []) => {
  if (!value) return "";
  const pattern = new RegExp(`\\b(?:${stopWords.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i");
  return clean(value.split(pattern)[0] || value);
};

const findStatus = (text = "") => {
  const normalized = clean(text).toLowerCase();

  const ordered = Object.entries(STATUS_ALIASES).sort((a, b) => b[0].length - a[0].length);
  for (const [phrase, mapped] of ordered) {
    const pattern = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(normalized)) {
      return mapped;
    }
  }

  return null;
};

const extractWithPatterns = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return clean(match[1]);
    }
  }
  return "";
};

export function extractEntities(text = "", intent = "unknown") {
  const normalized = clean(text);
  const entities = {};

  const taskPatterns = [
    /(?:delete|remove|cancel|trash|erase|assign|move|update|create)\s+(?:the\s+)?task\s+(.+?)(?:\s+from\b|\s+to\b|\s+in\b|\s+of\b|\s+on\b|$)/i,
    /(?:delete|remove|cancel|trash|erase)\s+(.+?)(?:\s+from\b|\s+in\b|\s+of\b|\s+on\b|$)/i,
    /(?:assign|move|update|create)\s+(.+?)(?:\s+to\b|\s+from\b|\s+in\b|\s+of\b|\s+on\b|$)/i,
  ];

  const projectPatterns = [
    /\bfrom\s+project\s+(.+?)(?:\s+to\b|\s+by\b|\s+for\b|$)/i,
    /\bfrom\s+(.+?)(?:\s+to\b|\s+by\b|\s+for\b|$)/i,
    /\bproject\s+(.+?)(?:\s+to\b|\s+by\b|\s+for\b|$)/i,
  ];

  const userPatterns = [
    /\bto\s+([a-zA-Z0-9._-]+(?:\s+[a-zA-Z0-9._-]+)?)$/i,
    /\bassign(?:ed)?\s+(?:to\s+)?([a-zA-Z0-9._-]+(?:\s+[a-zA-Z0-9._-]+)?)$/i,
    /\bfor\s+([a-zA-Z0-9._-]+(?:\s+[a-zA-Z0-9._-]+)?)$/i,
  ];

  const statusPatterns = [
    /\bmove\s+task\s+.+?\s+to\s+([a-zA-Z0-9_-]+(?:\s+[a-zA-Z0-9_-]+)?)$/i,
    /\bto\s+([a-zA-Z0-9_-]+(?:\s+[a-zA-Z0-9_-]+)?)$/i,
    /\bstatus\s+is\s+([a-zA-Z0-9_-]+(?:\s+[a-zA-Z0-9_-]+)?)$/i,
  ];

  if (["delete_task", "assign_task", "move_task", "update_deadline", "create_task"].includes(intent)) {
    const taskName = extractWithPatterns(normalized, taskPatterns);
    if (taskName) {
      entities.task_name = stripLeadingTokens(takeUntil(taskName, ["from", "to", "in", "of", "on"]));
    }
  }

  if (["delete_task", "assign_task", "create_task", "analyze_project", "add_member"].includes(intent)) {
    const projectName = extractWithPatterns(normalized, projectPatterns);
    if (projectName) {
      entities.project_name = stripLeadingTokens(takeUntil(projectName, ["to", "by", "for", "task"]));
    }
  }

  if (["assign_task", "add_member"].includes(intent)) {
    const userName = extractWithPatterns(normalized, userPatterns);
    if (userName) {
      const cleaned = stripLeadingTokens(userName);
      if (cleaned && !["task", "project", "done", "review"].includes(cleaned.toLowerCase())) {
        entities.user_name = cleaned;
      }
    }
  }

  if (["move_task", "update_deadline"].includes(intent)) {
    const statusText = extractWithPatterns(normalized, statusPatterns);
    if (statusText) {
      entities.status = findStatus(statusText) || clean(statusText).toLowerCase();
    } else {
      const status = findStatus(normalized);
      if (status) {
        entities.status = status;
      }
    }
  }

  if (intent === "create_task" && !entities.task_name) {
    const match = normalized.match(/(?:create|add|make)\s+(?:a\s+)?task\s+(.+?)(?:\s+for\b|\s+in\b|\s+to\b|$)/i);
    if (match?.[1]) {
      entities.task_name = stripLeadingTokens(takeUntil(match[1], ["for", "in", "to"]));
    }
  }

  return entities;
}
