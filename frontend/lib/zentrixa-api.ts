import { apiRequest } from "@/lib/api";

export type ZentrixaAction =
  | "create_task"
  | "delete_task"
  | "assign_task"
  | "move_task"
  | "create_panel"
  | "create_project"
  | "delete_project"
  | "add_member"
  | "update_deadline"
  | "analyze_project"
  | "unknown";

export interface ZentrixaParsedCommand {
  action: ZentrixaAction;
  task_name?: string | null;
  project_name?: string | null;
  panel_name?: string | null;
  user_name?: string | null;
  status?: string | null;
  confidence?: number | null;
}

export interface ZentrixaDispatchResult {
  action?: ZentrixaAction;
  intent?: string;
  executed: boolean;
  message: string;
  data?: unknown;
  task?: {
    id?: string;
    title?: string;
    projectName?: string;
    status?: string;
  } | null;
  projectId?: string | null;
  panelId?: string | null;
  nextPrompt?: string;
  missing?: string[];
  requiresConfirmation?: boolean;
  confirmationType?: string;
  taskId?: string | null;
  candidates?: Array<{
    id: string;
    title: string;
    projectName?: string;
    status?: string;
  }>;
}

export interface ZentrixaContext {
  projectId?: string;
  taskId?: string;
  developerId?: string;
  panelId?: string;
  status?: string;
  deadline?: string;
  [key: string]: unknown;
}

const AI_BASE_URL =
  process.env.NEXT_PUBLIC_ZENTRIXA_AI_URL?.trim() || "http://localhost:8001/ai/parse";

export async function parseZentrixaCommand(text: string): Promise<ZentrixaParsedCommand> {
  const response = await fetch(AI_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const data = (await response.json().catch(() => ({}))) as Partial<ZentrixaParsedCommand> & {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data.message || "Failed to parse command");
  }

  return {
    action: (data.action || "unknown") as ZentrixaAction,
    task_name: data.task_name ?? null,
    project_name: data.project_name ?? null,
    panel_name: data.panel_name ?? null,
    user_name: data.user_name ?? null,
    status: data.status ?? null,
    confidence: typeof data.confidence === "number" ? data.confidence : null,
  };
}

export async function dispatchZentrixaCommand(payload: {
  action: ZentrixaAction;
  text: string;
  confidence?: number | null;
  task_name?: string | null;
  project_name?: string | null;
  panel_name?: string | null;
  user_name?: string | null;
  status?: string | null;
  context?: ZentrixaContext;
  confirmed?: boolean;
  taskId?: string;
  projectId?: string;
  developerId?: string;
  panelId?: string;
  deadline?: string;
}): Promise<ZentrixaDispatchResult> {
  return apiRequest<ZentrixaDispatchResult>("/zentrixa/dispatch", {
    method: "POST",
    body: JSON.stringify({
      action: payload.action,
      intent: payload.action,
      text: payload.text,
      confidence: payload.confidence ?? 0,
      entities: {
        task_name: payload.task_name,
        project_name: payload.project_name,
        panel_name: payload.panel_name,
        user_name: payload.user_name,
        status: payload.status,
      },
      context: payload.context,
      confirmed: payload.confirmed,
      taskId: payload.taskId,
      projectId: payload.projectId,
      developerId: payload.developerId,
      panelId: payload.panelId,
      deadline: payload.deadline,
    }),
  });
}

export function summarizeParsedCommand(command: ZentrixaParsedCommand) {
  const parts = [`action: ${command.action}`];
  if (command.task_name) parts.push(`task: ${command.task_name}`);
  if (command.project_name) parts.push(`project: ${command.project_name}`);
  if (command.user_name) parts.push(`user: ${command.user_name}`);
  if (command.status) parts.push(`status: ${command.status}`);
  return parts.join(" | ");
}
