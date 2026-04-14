"use client";

import type { Meeting, Notification, Project, Task, User } from "@/lib/types";

export type ZentrixaSeverity = "critical" | "high" | "normal" | "low";
export type ZentrixaActionKind = "done" | "assign" | "open" | "snooze" | "dismiss" | "batch";

export type ZentrixaAction = {
  kind: ZentrixaActionKind;
  label: string;
};

export type ZentrixaAlertKind =
  | "overdue-task"
  | "deadline-risk"
  | "meeting-reminder"
  | "assignment-suggestion"
  | "priority-signal"
  | "productivity-insight"
  | "standup-summary"
  | "morning-briefing"
  | "end-day-recap"
  | "dependency-warning"
  | "workload-balance"
  | "smart-rename"
  | "focus-summary"
  | "smart-notification"
  | "inactive-follow-up"
  | "need-help"
  | "sprint-planning"
  | "mention";

export type ZentrixaAlert = {
  id: string;
  kind: ZentrixaAlertKind;
  title: string;
  message: string;
  severity: ZentrixaSeverity;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
  dueAt?: string;
  sourceId?: string;
  sourceLabel?: string;
  projectCount?: number;
  hidden?: boolean;
  suggestedAssignee?: string;
  suggestedPriority?: Task["priority"];
  actions: ZentrixaAction[];
  chips: string[];
  createdAt: string;
};

type GenerateAlertInput = {
  user: User;
  projects: Project[];
  notifications: Notification[];
  meetings: Meeting[];
  now: Date;
  pathname?: string;
};

const activeStatuses: Task["status"][] = ["todo", "in_progress", "review"];
const riskKeywords = ["blocked", "waiting", "urgent", "release", "deploy", "bug", "crash", "payment", "login"];
const blockedKeywords = ["blocked", "waiting on", "depends on", "needs", "awaiting", "stuck"];
const renameKeywords = ["task", "todo", "new task", "misc", "stuff", "update", "fix", "work"];

const toDate = (value?: string | Date | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const minutesUntil = (value?: string | Date | null, now = new Date()) => {
  const date = toDate(value);
  if (!date) return null;
  return Math.round((date.getTime() - now.getTime()) / 60000);
};

const hoursBetween = (a?: string | Date | null, b?: string | Date | null) => {
  const dateA = toDate(a);
  const dateB = toDate(b);
  if (!dateA || !dateB) return null;
  return Math.abs((dateA.getTime() - dateB.getTime()) / 3600000);
};

const formatTodayKey = (date = new Date()) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

const splitName = (name: string) => {
  const parts = (name || "").trim().split(/\s+/);
  return {
    firstName: parts[0] || "Teammate",
    lastName: parts.slice(1).join(" "),
  };
};

const getProjectMemberLabel = (member: Project["members"][number]) => {
  const { firstName, lastName } = member.user;
  return `${firstName} ${lastName}`.trim();
};

const getProjectTasks = (project: Project) => project.panels.flatMap((panel) => panel.tasks);

const getActiveTasks = (project: Project) => getProjectTasks(project).filter((task) => activeStatuses.includes(task.status));

const getProjectWorkloads = (project: Project) => {
  const workloads = new Map<string, number>();
  for (const member of project.members) {
    workloads.set(member.user.id, 0);
  }

  for (const task of getActiveTasks(project)) {
    if (task.assignee?.id) {
      workloads.set(task.assignee.id, (workloads.get(task.assignee.id) || 0) + 1);
    }
  }

  return workloads;
};

const getTaskKeywords = (task: Task) => {
  const text = `${task.title} ${task.description} ${task.comments.map((comment) => comment.content).join(" ")}`.toLowerCase();
  return {
    blocked: blockedKeywords.some((keyword) => text.includes(keyword)),
    risky: riskKeywords.some((keyword) => text.includes(keyword)),
    renameable: renameKeywords.some((keyword) => text.trim() === keyword || text.startsWith(`${keyword} `) || text.includes(` ${keyword} `)),
  };
};

const suggestPriority = (task: Task, now: Date) => {
  const dueMinutes = minutesUntil(task.dueDate, now);
  const keywords = getTaskKeywords(task);

  if (task.priority === "urgent") return null;
  if (dueMinutes !== null && dueMinutes <= 120) return "urgent";
  if (dueMinutes !== null && dueMinutes <= 24 * 60) return "high";
  if (keywords.risky) return "high";
  return null;
};

const suggestAssignee = (project: Project, task: Task) => {
  const workloads = getProjectWorkloads(project);
  const candidates = project.members
    .filter((member) => member.user.id !== task.reporter.id)
    .map((member) => ({
      member,
      workload: workloads.get(member.user.id) || 0,
    }))
    .sort((a, b) => a.workload - b.workload);

  return candidates[0]?.member.user;
};

const buildOpenAction = (): ZentrixaAction => ({ kind: "open", label: "Open" });

const buildSnoozeAction = (): ZentrixaAction => ({ kind: "snooze", label: "Snooze" });

const buildDoneAction = (): ZentrixaAction => ({ kind: "done", label: "Done" });

const buildAssignAction = (): ZentrixaAction => ({ kind: "assign", label: "Assign" });

const buildBatchAction = (): ZentrixaAction => ({ kind: "batch", label: "Batch" });

const makeAlert = (alert: Omit<ZentrixaAlert, "createdAt"> & { createdAt?: string }): ZentrixaAlert => ({
  createdAt: alert.createdAt || new Date().toISOString(),
  ...alert,
});

const buildMorningBriefing = ({ user, projects, now }: GenerateAlertInput): ZentrixaAlert | null => {
  const myTasks = projects.flatMap(getProjectTasks).filter((task) => task.assignee?.id === user.id || task.reporter.id === user.id);
  if (myTasks.length === 0) return null;

  const dueSoon = myTasks.filter((task) => {
    const remaining = minutesUntil(task.dueDate, now);
    return remaining !== null && remaining > 0 && remaining <= 24 * 60 && activeStatuses.includes(task.status);
  });

  const completed = myTasks.filter((task) => task.status === "done").length;

  return makeAlert({
    id: `morning-${formatTodayKey(now)}`,
    kind: "morning-briefing",
    title: "Good morning. Here’s your quick brief.",
    message: dueSoon.length
      ? `You have ${dueSoon.length} item${dueSoon.length > 1 ? "s" : ""} due soon, and ${completed} task${completed === 1 ? "" : "s"} already closed out.`
      : `You have ${myTasks.length} live task${myTasks.length === 1 ? "" : "s"} in play, and ${completed} already closed out.`,
    severity: "normal",
    actions: [buildBatchAction(), buildOpenAction()],
    chips: ["standup summary", "workload check", "daily planning"],
  });
};

const buildEndDayRecap = ({ user, projects, now }: GenerateAlertInput): ZentrixaAlert | null => {
  const activeTasks = projects.flatMap(getProjectTasks).filter((task) => task.assignee?.id === user.id || task.reporter.id === user.id);
  if (activeTasks.length === 0) return null;

  const doneCount = activeTasks.filter((task) => task.status === "done").length;
  const blockedCount = activeTasks.filter((task) => getTaskKeywords(task).blocked).length;
  const overdueCount = activeTasks.filter((task) => {
    const dueMinutes = minutesUntil(task.dueDate, now);
    return dueMinutes !== null && dueMinutes < 0 && task.status !== "done";
  }).length;

  return makeAlert({
    id: `recap-${formatTodayKey(now)}`,
    kind: "end-day-recap",
    title: "Before you log off, here’s the short version.",
    message:
      `You closed ${doneCount} task${doneCount === 1 ? "" : "s"}, ${blockedCount} still need a hand, and ${overdueCount} slipped past their date.`.trim(),
    severity: overdueCount > 0 ? "high" : "normal",
    actions: [buildBatchAction(), buildSnoozeAction()],
    chips: ["wrap-up", "tomorrow plan", "team summary"],
  });
};

const buildStandupSummary = ({ user, projects, now }: GenerateAlertInput): ZentrixaAlert | null => {
  const myTasks = projects.flatMap(getProjectTasks).filter((task) => task.assignee?.id === user.id || task.reporter.id === user.id);
  if (myTasks.length === 0) return null;

  const done = myTasks.filter((task) => task.status === "done").length;
  const inProgress = myTasks.filter((task) => task.status === "in_progress").length;
  const blocked = myTasks.filter((task) => getTaskKeywords(task).blocked || task.status === "review").length;

  return makeAlert({
    id: `standup-${formatTodayKey(now)}`,
    kind: "standup-summary",
    title: "Standup snapshot",
    message: `You’ve got ${done} done, ${inProgress} moving, and ${blocked} worth flagging before the next check-in.`,
    severity: "normal",
    actions: [buildOpenAction(), buildBatchAction()],
    chips: ["daily standup", "status update", "project pulse"],
  });
};

const buildProductivityInsight = ({ user, projects, now }: GenerateAlertInput): ZentrixaAlert | null => {
  const myTasks = projects.flatMap(getProjectTasks).filter((task) => task.assignee?.id === user.id || task.reporter.id === user.id);
  if (myTasks.length < 3) return null;

  const dueSoon = myTasks.filter((task) => {
    const remaining = minutesUntil(task.dueDate, now);
    return remaining !== null && remaining > 0 && remaining <= 48 * 60;
  }).length;
  const unassigned = projects.flatMap(getProjectTasks).filter((task) => !task.assignee).length;

  return makeAlert({
    id: `insight-${formatTodayKey(now)}`,
    kind: "productivity-insight",
    title: "Tiny pattern I noticed",
    message: dueSoon > 0
      ? `${dueSoon} of your active items are closing in. A short focus block would buy back some breathing room.`
      : `Your board looks calm right now. If you want momentum, there are ${unassigned} unassigned item${unassigned === 1 ? "" : "s"} we can tidy up.`,
    severity: "low",
    actions: [buildOpenAction()],
    chips: ["focus block", "batch review", "priority sweep"],
  });
};

const buildMeetingAlert = (meeting: Meeting, projectName: string, now: Date): ZentrixaAlert | null => {
  const minutes = minutesUntil(meeting.scheduledFor, now);
  if (minutes === null) return null;
  if (minutes > 24 * 60) return null;
  if (minutes < -30) return null;

  const friendly = minutes <= 15
    ? "This starts very soon."
    : minutes <= 60
      ? "You’ll want to be ready soon."
      : "This is coming up later today.";

  return makeAlert({
    id: `meeting-${meeting.id}`,
    kind: "meeting-reminder",
    title: meeting.title || "Meeting reminder",
    message: `${friendly} ${projectName ? `It’s for ${projectName}.` : ""}`.trim(),
    severity: minutes <= 15 ? "critical" : "high",
    projectId: meeting.projectId,
    projectName,
    sourceId: meeting.id,
    sourceLabel: "meeting",
    dueAt: meeting.scheduledFor,
    actions: [buildOpenAction(), buildSnoozeAction()],
    chips: ["join prep", "agenda", "calendar"],
  });
};

const buildNotificationAlert = (notification: Notification): ZentrixaAlert | null => {
  const baseActions = [buildOpenAction(), buildSnoozeAction()];

  if (notification.type === "task_assigned") {
    return makeAlert({
      id: `note-${notification.id}`,
      kind: "smart-notification",
      title: notification.title || "New task assigned",
      message: notification.message || "You’ve got something new on your board.",
      severity: "normal",
      projectId: notification.projectId,
      taskId: notification.taskId,
      sourceId: notification.id,
      sourceLabel: "notification",
      actions: [buildOpenAction(), buildDoneAction(), buildSnoozeAction()],
      chips: ["assigned", "open task", "quick review"],
    });
  }

  if (notification.type === "comment_mentioned") {
    return makeAlert({
      id: `note-${notification.id}`,
      kind: "mention",
      title: notification.title || "You were mentioned",
      message: notification.message || "Someone is waiting on your input.",
      severity: "high",
      projectId: notification.projectId,
      taskId: notification.taskId,
      sourceId: notification.id,
      sourceLabel: "mention",
      actions: [buildOpenAction(), buildDoneAction(), buildSnoozeAction()],
      chips: ["reply", "open thread", "mention"],
    });
  }

  if (notification.type === "project_chat_dm") {
    return makeAlert({
      id: `note-${notification.id}`,
      kind: "smart-notification",
      title: notification.title || "Private message",
      message: notification.message || "Someone sent you a note.",
      severity: "normal",
      projectId: notification.projectId,
      sourceId: notification.id,
      sourceLabel: "project chat",
      actions: baseActions,
      chips: ["reply", "open chat", "snooze"],
    });
  }

  if (notification.type === "meeting_reminder") {
    return makeAlert({
      id: `note-${notification.id}`,
      kind: "meeting-reminder",
      title: notification.title || "Meeting reminder",
      message: notification.message || "You have a meeting coming up.",
      severity: "high",
      projectId: notification.projectId,
      sourceId: notification.id,
      sourceLabel: "meeting",
      actions: [buildOpenAction(), buildSnoozeAction()],
      chips: ["join prep", "calendar", "focus"],
    });
  }

  if (notification.type === "project_added") {
    return makeAlert({
      id: `note-${notification.id}`,
      kind: "smart-notification",
      title: notification.title || "Project added",
      message: notification.message || "You’ve been added to a project.",
      severity: "normal",
      projectId: notification.projectId,
      sourceId: notification.id,
      sourceLabel: "notification",
      actions: [buildOpenAction(), buildSnoozeAction()],
      chips: ["open project", "new team", "start here"],
    });
  }

  if (notification.type === "task_overdue" || notification.type === "deadline_risk" || notification.type === "need_help") {
    return makeAlert({
      id: `note-${notification.id}`,
      kind: notification.type === "need_help" ? "need-help" : "overdue-task",
      title: notification.title || "Task update",
      message: notification.message || "A task needs your attention.",
      severity: notification.type === "deadline_risk" ? "high" : "critical",
      projectId: notification.projectId,
      taskId: notification.taskId,
      sourceId: notification.id,
      sourceLabel: "notification",
      actions: [buildOpenAction(), buildDoneAction(), buildSnoozeAction()],
      chips: ["focus", "open task", "assist"],
    });
  }

  return null;
};

const buildOverdueAlert = (task: Task, project: Project, now: Date): ZentrixaAlert | null => {
  const remaining = minutesUntil(task.dueDate, now);
  if (remaining === null || remaining >= 0 || task.status === "done") return null;

  return makeAlert({
    id: `overdue-${task.id}`,
    kind: "overdue-task",
    title: "This item has slipped past its date",
    message: `${task.title} is overdue in ${project.name}. ${task.assignee ? `It’s with ${task.assignee.firstName}.` : "It still needs an owner."}`,
    severity: Math.abs(remaining) > 24 * 60 ? "critical" : "high",
    projectId: project.id,
    projectName: project.name,
    taskId: task.id,
    taskTitle: task.title,
    dueAt: task.dueDate,
    suggestedAssignee: task.assignee ? undefined : suggestAssignee(project, task)?.firstName,
    suggestedPriority: suggestPriority(task, now) || undefined,
    actions: [buildDoneAction(), buildAssignAction(), buildOpenAction(), buildSnoozeAction()],
    chips: ["overdue", "fix now", "need help"],
  });
};

const buildDeadlineRiskAlert = (task: Task, project: Project, now: Date): ZentrixaAlert | null => {
  const remaining = minutesUntil(task.dueDate, now);
  if (remaining === null || remaining <= 0 || task.status === "done") return null;
  if (remaining > 72 * 60) return null;

  return makeAlert({
    id: `risk-${task.id}`,
    kind: "deadline-risk",
    title: "This one is getting close",
    message: `${task.title} has ${Math.max(1, Math.round(remaining / 60))} hour${Math.round(remaining / 60) === 1 ? "" : "s"} left in ${project.name}.`,
    severity: remaining <= 12 * 60 ? "critical" : "high",
    projectId: project.id,
    projectName: project.name,
    taskId: task.id,
    taskTitle: task.title,
    dueAt: task.dueDate,
    suggestedPriority: suggestPriority(task, now) || undefined,
    actions: [buildDoneAction(), buildAssignAction(), buildOpenAction(), buildSnoozeAction()],
    chips: ["risk check", "priority", "follow up"],
  });
};

const buildInactiveFollowUpAlert = (task: Task, project: Project, now: Date): ZentrixaAlert | null => {
  const updatedHours = hoursBetween(task.updatedAt, now);
  if (updatedHours === null || updatedHours < 72 || task.status === "done") return null;

  return makeAlert({
    id: `inactive-${task.id}`,
    kind: "inactive-follow-up",
    title: "This task has gone quiet",
    message: `${task.title} hasn’t moved in a while. A quick nudge might unblock it.`,
    severity: "normal",
    projectId: project.id,
    projectName: project.name,
    taskId: task.id,
    taskTitle: task.title,
    actions: [buildOpenAction(), buildAssignAction(), buildSnoozeAction()],
    chips: ["follow up", "need help?", "check in"],
  });
};

const buildDependencyAlert = (task: Task, project: Project): ZentrixaAlert | null => {
  const keywords = getTaskKeywords(task);
  if (!keywords.blocked) return null;

  return makeAlert({
    id: `dependency-${task.id}`,
    kind: "dependency-warning",
    title: "This looks blocked",
    message: `${task.title} sounds like it depends on something else. We should surface the blocker before it slows the rest of the lane.`,
    severity: "high",
    projectId: project.id,
    projectName: project.name,
    taskId: task.id,
    taskTitle: task.title,
    actions: [buildOpenAction(), buildAssignAction(), buildSnoozeAction()],
    chips: ["blocked", "dependency", "help needed"],
  });
};

const buildWorkloadAlert = (project: Project): ZentrixaAlert | null => {
  const workloads = getProjectWorkloads(project);
  const entries = Array.from(workloads.entries());
  if (entries.length < 2) return null;

  const sorted = entries.sort((a, b) => a[1] - b[1]);
  const lightest = sorted[0];
  const heaviest = sorted[sorted.length - 1];
  if (!lightest || !heaviest) return null;
  if (heaviest[1] - lightest[1] < 2) return null;

  const lightestMember = project.members.find((member) => member.user.id === lightest[0]);
  const heaviestMember = project.members.find((member) => member.user.id === heaviest[0]);

  return makeAlert({
    id: `workload-${project.id}`,
    kind: "workload-balance",
    title: "Workload is a little uneven",
    message: `${heaviestMember ? getProjectMemberLabel(heaviestMember) : "One teammate"} is carrying more active work than ${lightestMember ? getProjectMemberLabel(lightestMember) : "the rest"}.`,
    severity: "low",
    projectId: project.id,
    projectName: project.name,
    actions: [buildAssignAction(), buildBatchAction(), buildOpenAction()],
    chips: ["balance", "reassign", "capacity"],
  });
};

const buildRenameAlert = (task: Task, project: Project): ZentrixaAlert | null => {
  const keywords = getTaskKeywords(task);
  if (!keywords.renameable) return null;

  const refined = `${project.name} - ${task.title}`.replace(/\btask\b/gi, "item");

  return makeAlert({
    id: `rename-${task.id}`,
    kind: "smart-rename",
    title: "This title could be clearer",
    message: `A more specific name would help the team scan it faster. Something like "${refined}" would read better.`,
    severity: "low",
    projectId: project.id,
    projectName: project.name,
    taskId: task.id,
    taskTitle: task.title,
    actions: [buildOpenAction(), buildSnoozeAction()],
    chips: ["rename", "clarity", "quick polish"],
  });
};

const buildPriorityAlert = (task: Task, project: Project, now: Date): ZentrixaAlert | null => {
  const suggestion = suggestPriority(task, now);
  if (!suggestion || suggestion === task.priority) return null;

  return makeAlert({
    id: `priority-${task.id}`,
    kind: "priority-signal",
    title: "I’d bump this a notch",
    message: `${task.title} feels like a ${suggestion} priority right now.`,
    severity: suggestion === "urgent" ? "high" : "normal",
    projectId: project.id,
    projectName: project.name,
    taskId: task.id,
    taskTitle: task.title,
    suggestedPriority: suggestion,
    actions: [buildOpenAction(), buildDoneAction(), buildSnoozeAction()],
    chips: ["priority", "triage", "quick action"],
  });
};

const buildAssignmentAlert = (task: Task, project: Project): ZentrixaAlert | null => {
  if (task.assignee) return null;
  const suggestion = suggestAssignee(project, task);
  if (!suggestion) return null;

  return makeAlert({
    id: `assign-${task.id}`,
    kind: "assignment-suggestion",
    title: "I found a good fit for this",
    message: `${task.title} could land well with ${splitName(`${suggestion.firstName} ${suggestion.lastName}`.trim()).firstName}.`,
    severity: "normal",
    projectId: project.id,
    projectName: project.name,
    taskId: task.id,
    taskTitle: task.title,
    suggestedAssignee: `${suggestion.firstName} ${suggestion.lastName}`.trim(),
    actions: [buildAssignAction(), buildOpenAction(), buildSnoozeAction()],
    chips: ["assign", "balance", "owner"],
  });
};

const buildNeedHelpAlert = (task: Task, project: Project, now: Date): ZentrixaAlert | null => {
  const remaining = minutesUntil(task.dueDate, now);
  const inactiveHours = hoursBetween(task.updatedAt, now);
  const keywords = getTaskKeywords(task);
  if (!(keywords.blocked || (remaining !== null && remaining < 0) || (inactiveHours !== null && inactiveHours > 72))) return null;

  return makeAlert({
    id: `help-${task.id}`,
    kind: "need-help",
    title: "This could use a hand",
    message: `${task.title} looks like it might need a quick nudge or a teammate to jump in.`,
    severity: "high",
    projectId: project.id,
    projectName: project.name,
    taskId: task.id,
    taskTitle: task.title,
    actions: [buildAssignAction(), buildOpenAction(), buildSnoozeAction()],
    chips: ["need help?", "unblock", "team up"],
  });
};

const buildSprintPlanningAlert = ({ projects, now }: GenerateAlertInput): ZentrixaAlert | null => {
  const horizon = now.getTime() + 7 * 24 * 60 * 60 * 1000;
  const upcoming = projects.flatMap(getProjectTasks).filter((task) => {
    const due = toDate(task.dueDate);
    return due && due.getTime() <= horizon && activeStatuses.includes(task.status);
  });

  if (upcoming.length < 4) return null;

  return makeAlert({
    id: `sprint-${formatTodayKey(now)}`,
    kind: "sprint-planning",
    title: "Looks like sprint planning would help",
    message: `There are ${upcoming.length} active items due inside a week. Grouping them now would keep the board calmer.`,
    severity: "normal",
    actions: [buildBatchAction(), buildOpenAction()],
    chips: ["sprint plan", "batch organize", "capacity"],
  });
};

const buildFocusSummary = ({ projects, now }: GenerateAlertInput): ZentrixaAlert | null => {
  const overloadedProjects = projects.filter((project) => getActiveTasks(project).length > 5);
  if (overloadedProjects.length === 0) return null;

  return makeAlert({
    id: `focus-${formatTodayKey(now)}`,
    kind: "focus-summary",
    title: "Quiet mode is on",
    message: `I’ve tucked away the non-urgent noise. ${overloadedProjects.length} project${overloadedProjects.length === 1 ? "" : "s"} still have active work waiting in the wings.`,
    severity: "normal",
    projectCount: overloadedProjects.length,
    actions: [buildBatchAction(), buildSnoozeAction()],
    chips: ["focus mode", "critical only", "later summary"],
  });
};

const buildNotificationHighlights = (notifications: Notification[]) =>
  notifications
    .filter((notification) => !notification.read)
    .slice(0, 5)
    .map((notification) => buildNotificationAlert(notification))
    .filter((item): item is ZentrixaAlert => Boolean(item));

export const isFocusModeContext = (params: {
  user: User | null;
  pathname?: string;
  projects: Project[];
}) => {
  const { user, pathname, projects } = params;
  if (!user || user.role !== "admin") return false;
  if (pathname?.includes("/admin")) return true;

  return projects.some((project) => project.owner?.role === "admin");
};

export const deriveZentrixaAlerts = (input: GenerateAlertInput) => {
  const { user, projects, notifications, meetings, now, pathname } = input;
  const activeProjects = projects.filter((project) => project.status === "active");
  const baseAlerts: ZentrixaAlert[] = [];

  for (const notification of buildNotificationHighlights(notifications)) {
    baseAlerts.push(notification);
  }

  for (const project of activeProjects) {
    const tasks = getProjectTasks(project);
    for (const task of tasks) {
      const overdue = buildOverdueAlert(task, project, now);
      const risk = buildDeadlineRiskAlert(task, project, now);
      const inactive = buildInactiveFollowUpAlert(task, project, now);
      const dependency = buildDependencyAlert(task, project);
      const priority = buildPriorityAlert(task, project, now);
      const assign = buildAssignmentAlert(task, project);
      const rename = buildRenameAlert(task, project);
      const needHelp = buildNeedHelpAlert(task, project, now);

      for (const item of [overdue, risk, inactive, dependency, priority, assign, rename, needHelp]) {
        if (item) baseAlerts.push(item);
      }
    }

    const workload = buildWorkloadAlert(project);
    if (workload) baseAlerts.push(workload);
  }

  for (const meeting of meetings) {
    const project = projects.find((entry) => entry.id === meeting.projectId);
    const item = buildMeetingAlert(meeting, project?.name || "", now);
    if (item) baseAlerts.push(item);
  }

  const standup = buildStandupSummary({ user, projects, notifications, meetings, now, pathname });
  const briefing = buildMorningBriefing({ user, projects, notifications, meetings, now, pathname });
  const recap = buildEndDayRecap({ user, projects, notifications, meetings, now, pathname });
  const productivity = buildProductivityInsight({ user, projects, notifications, meetings, now, pathname });
  const sprint = buildSprintPlanningAlert({ user, projects, notifications, meetings, now, pathname });
  const focus = buildFocusSummary({ user, projects, notifications, meetings, now, pathname });

  for (const item of [standup, briefing, recap, productivity, sprint, focus]) {
    if (item) baseAlerts.push(item);
  }

  const seen = new Set<string>();
  const deduped: ZentrixaAlert[] = [];
  for (const alert of baseAlerts) {
    if (seen.has(alert.id)) continue;
    seen.add(alert.id);
    deduped.push(alert);
  }

  const critical = deduped.filter((alert) => alert.severity === "critical");
  const high = deduped.filter((alert) => alert.severity === "high");
  const normal = deduped.filter((alert) => alert.severity === "normal");
  const low = deduped.filter((alert) => alert.severity === "low");

  const focusMode = isFocusModeContext({ user, pathname, projects });

  return {
    alerts: [...critical, ...high, ...normal, ...low],
    focusMode,
    summary: {
      total: deduped.length,
      critical: critical.length,
      high: high.length,
      normal: normal.length,
      low: low.length,
    },
  };
};

export const buildFriendlyAssistantMessage = (alert: ZentrixaAlert) => {
  switch (alert.kind) {
    case "overdue-task":
      return `${alert.taskTitle || alert.title} slipped past its date. I can help you close it out or hand it to someone else.`;
    case "deadline-risk":
      return `${alert.taskTitle || alert.title} is getting close. A little push now will save a scramble later.`;
    case "meeting-reminder":
      return `${alert.title} is on deck. I kept the reminder short so you can jump in ready.`;
    case "assignment-suggestion":
      return `${alert.taskTitle || alert.title} looks ready for a home. I found a teammate who should fit nicely.`;
    case "priority-signal":
      return `${alert.taskTitle || alert.title} feels more urgent than it looks. I’d bump it up.`;
    case "productivity-insight":
      return alert.message;
    case "standup-summary":
      return alert.message;
    case "morning-briefing":
      return alert.message;
    case "end-day-recap":
      return alert.message;
    case "dependency-warning":
      return `${alert.taskTitle || alert.title} seems blocked. I’d surface the blocker before it spreads.`;
    case "workload-balance":
      return alert.message;
    case "smart-rename":
      return alert.message;
    case "focus-summary":
      return alert.message;
    case "inactive-follow-up":
      return alert.message;
    case "need-help":
      return alert.message;
    case "sprint-planning":
      return alert.message;
    case "smart-notification":
    case "mention":
      return alert.message;
    default:
      return alert.message;
  }
};

export const getAlertPriorityLabel = (alert: ZentrixaAlert) => {
  if (alert.severity === "critical") return "Now";
  if (alert.severity === "high") return "Soon";
  if (alert.severity === "normal") return "Next";
  return "Later";
};

export const getProjectLabel = (project?: Project) => project?.name || "your project";

export const getTaskOwnerLabel = (task?: Task) => {
  if (!task?.assignee) return "someone";
  return `${task.assignee.firstName} ${task.assignee.lastName}`.trim();
};
