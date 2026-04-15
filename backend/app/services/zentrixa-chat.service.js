import mongoose from 'mongoose';
import Project from '../models/Project.js';
import Panel from '../models/Panel.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import ProjectRequest from '../models/ProjectRequest.js';
import Notification from '../models/Notification.js';
import ZentrixaChatMessage from '../models/ZentrixaChatMessage.js';
import { createProject, deleteProject, inviteDeveloper, removeProjectMember, updateProject } from '../controllers/project.controller.js';
import { createTask, updateTask, updateTaskStatus, addTaskComment } from '../controllers/task.controller.js';
import { extractEntities } from '../utils/entityExtractor.js';

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

const GENERAL_CHAT_PATTERNS = [
  /\b(hi|hello|hey|help|thanks|thank you|good morning|good afternoon|good evening)\b/i,
  /\bhow are you\b/i,
  /\bwhat can you do\b/i,
  /\bwho are you\b/i,
];

const COMMAND_HINTS = [
  { intent: 'create_project', pattern: /\b(create|make|start|build)\s+project\b/i },
  { intent: 'delete_project', pattern: /\b(delete|remove|archive)\s+project\b/i },
  { intent: 'rename_project', pattern: /\brename\s+project\b/i },
  { intent: 'create_task', pattern: /\b(create|make|add)\s+task\b/i },
  { intent: 'delete_task', pattern: /\b(delete|remove|cancel|trash|erase)\s+(?:the\s+)?task\b/i },
  { intent: 'update_task', pattern: /\b(rename|retitle|change\s+name)\b/i },
  { intent: 'assign_task', pattern: /\bassign\b/i },
  { intent: 'move_task', pattern: /\b(move|change)\b/i },
  { intent: 'update_task', pattern: /\b(update|edit|change)\s+task\b/i },
  { intent: 'comment_task', pattern: /\b(comment|reply|note)\b/i },
  { intent: 'show_delayed', pattern: /\b(overdue|delayed|late)\b/i },
  { intent: 'add_member', pattern: /\b(invite|add)\b/i },
  { intent: 'remove_member', pattern: /\b(remove|kick)\b/i },
];

const COMMAND_DEFINITIONS = [
  { intent: 'create_project', label: 'Create a project' },
  { intent: 'delete_project', label: 'Delete a project' },
  { intent: 'rename_project', label: 'Rename a project' },
  { intent: 'analyze_project', label: 'Show project summary' },
  { intent: 'create_task', label: 'Create a task' },
  { intent: 'delete_task', label: 'Delete a task' },
  { intent: 'assign_task', label: 'Assign a task' },
  { intent: 'move_task', label: 'Change task status' },
  { intent: 'update_task', label: 'Update a task' },
  { intent: 'comment_task', label: 'Comment on a task' },
  { intent: 'show_delayed', label: 'Show overdue tasks' },
  { intent: 'add_member', label: 'Invite a member' },
  { intent: 'remove_member', label: 'Remove a member' },
  { intent: 'update_deadline', label: 'Update a deadline' },
];

const CONFIRMATION_INTENTS = new Set([
  'create_project',
  'delete_project',
  'rename_project',
  'analyze_project',
  'create_task',
  'delete_task',
  'assign_task',
  'move_task',
  'update_task',
  'comment_task',
  'update_deadline',
  'add_member',
  'remove_member',
]);

const ROLE_MESSAGES = {
  create_project: "You don't have permission to create project. Ask admin.",
  delete_project: "You don't have permission to delete project. Ask admin.",
  rename_project: "You don't have permission to rename project. Ask admin.",
  add_member: "You don't have permission to invite members. Ask admin.",
  remove_member: "You don't have permission to remove members. Ask admin.",
  assign_task: "You don't have permission to assign users. Ask admin.",
  create_task: null,
  delete_task: "You don't have permission to delete task. Ask admin.",
  update_project: "You don't have permission to update project. Ask admin.",
  update_deadline: "You don't have permission to update deadlines. Ask admin.",
  comment_task: null,
  update_task: null,
  move_task: null,
  show_delayed: null,
};

const normalize = (value = '') => value.replace(/\s+/g, ' ').trim();

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildRegex = (value = '') => new RegExp(escapeRegExp(normalize(value)), 'i');

const normalizeCommandKey = (value = '') => normalize(value).toLowerCase().replace(/[\s_-]+/g, '_');

const toCommandLabel = (value = '') => normalize(value).replace(/_/g, ' ').trim();

const buildConfirmationResponse = ({ command, message, payload, context = {} }) => ({
  executed: false,
  mode: 'command',
  type: 'CONFIRM',
  command,
  reply: message,
  message,
  payload,
  pendingCommand: {
    ...payload,
    command,
    text: context.text || '',
  },
  requiresConfirmation: true,
});

const createMockRes = () => {
  const state = { statusCode: 200, body: null };
  return {
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(payload) {
      state.body = payload;
      return this;
    },
    getState() {
      return state;
    },
  };
};

const runController = async (controller, req) => {
  const mockRes = createMockRes();
  await controller(req, mockRes);
  return mockRes.getState();
};

const isGeneralChat = (text = '') => GENERAL_CHAT_PATTERNS.some((pattern) => pattern.test(text));

const detectIntent = (text = '') => {
  const normalized = normalize(text);
  const matched = COMMAND_HINTS.find((entry) => entry.pattern.test(normalized));
  return matched?.intent || 'unknown';
};

const looksLikeProjectMembershipRequest = ({ text = '', intent = 'unknown', entities = {}, context = {} }) => {
  if (intent !== 'assign_task') return false;
  const normalized = normalize(text).toLowerCase();
  const hasProject = Boolean(entities.project_name || context.projectName);
  const hasUser = Boolean(entities.user_name || context.userName || /@[^\s@]+\.[^\s@]+/.test(normalized));
  const hasTask = Boolean(entities.task_name || context.taskName || /\btask\b/i.test(normalized));
  const mentionsProjectMembership = /\b(assign|add|invite)\b/.test(normalized) && /\bproject\b/.test(normalized);

  return hasProject && hasUser && !hasTask && mentionsProjectMembership;
};

const formatName = (user) => {
  if (!user) return 'someone';
  return user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'someone';
};

const formatTaskTitle = (task) => task?.title || 'task';

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const buildProjectSummary = async (projectId) => {
  if (!projectId || !isObjectId(projectId)) return null;
  const project = await Project.findById(projectId)
    .populate('developers', 'name email role')
    .populate('createdBy', 'name email role')
    .populate('panels');

  if (!project) return null;

  const tasks = await Task.find({ projectId })
    .populate('assignedDeveloper', 'name email role')
    .lean();

  const total = tasks.length;
  const completed = tasks.filter((task) => task.approvedByAdmin || task.status === 'completed').length;
  const inProgress = tasks.filter((task) => task.status === 'in-progress').length;
  const pending = tasks.filter((task) => task.status === 'pending' || !task.status).length;
  const review = tasks.filter((task) => task.status === 'review').length;
  const progress = typeof project.progress === 'number' ? project.progress : (total > 0 ? Math.round((completed / total) * 100) : 0);

  return {
    project,
    total,
    completed,
    inProgress,
    pending,
    review,
    progress,
  };
};

const saveZentrixaMessage = async ({ userId, role, content, mode = 'chat', intent = 'unknown', projectId = null, taskId = null, metadata = {} }) => {
  if (!userId || !content) return null;
  try {
    return await ZentrixaChatMessage.create({
      userId,
      role,
      content,
      mode,
      intent,
      projectId: projectId || null,
      taskId: taskId || null,
      metadata,
    });
  } catch (error) {
    console.error('Zentrixa chat persistence error:', error);
    return null;
  }
};

const getZentrixaHistory = async (userId, limit = 40) => {
  if (!userId) return [];
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 40;
  const items = await ZentrixaChatMessage.find({ userId })
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .populate('projectId', 'name')
    .populate('taskId', 'title')
    .lean();

  return items.reverse();
};

const buildChatMessages = (user, text, context = {}) => ([
  {
    role: 'system',
    content:
      'You are Zentrixa, a warm proactive teammate. Reply like a helpful human. Keep it concise, natural, and specific. Never mention backend APIs, routes, JSON, or internal implementation. Do not sound robotic.',
  },
  {
    role: 'user',
    content: `User role: ${user?.role || 'developer'}\nProject context: ${context.projectName || 'none'}\nTask context: ${context.taskName || 'none'}\nMessage: ${text}`,
  },
]);

const buildCommandClassifierMessages = (user, text, context = {}) => ([
  {
    role: 'system',
    content: [
      'You are Zentrixa, a command router for a project management assistant.',
      'Classify the user message into one of the allowed intents or mark it as chat.',
      'Return JSON only. No markdown, no prose outside JSON.',
      'If the message is just small talk, encouragement, or a question unrelated to project actions, use mode "chat".',
      'If the user asks for an action not in the allowed list, use mode "chat" and reply naturally that you can help with project commands.',
      'If the user is replying to a previous clarification, use the pending command context to infer the next step.',
      `Allowed commands: ${COMMAND_DEFINITIONS.map((item) => `${item.intent}:${item.label}`).join(' | ')}`,
      'Required JSON shape:',
      '{"mode":"chat|command","intent":"create_task|delete_task|assign_task|move_task|update_task|comment_task|show_delayed|create_project|delete_project|rename_project|analyze_project|add_member|remove_member|update_deadline|unknown","confidence":0,"reply":"human response","missing":[],"entities":{"project_name":"","task_name":"","user_name":"","status":"","deadline":"","new_name":"","description":"","comment":""},"pendingCommand":null}',
    ].join(' '),
  },
  {
    role: 'user',
    content: JSON.stringify({
      text,
      userRole: user?.role || 'developer',
      projectContext: context.projectName || '',
      taskContext: context.taskName || '',
      pendingCommand: context.pendingCommand || null,
    }),
  },
]);

const parseJsonObject = (value = '') => {
  const raw = normalize(value);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const classifyZentrixaMessage = async ({ user, text, context = {} }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: buildCommandClassifierMessages(user, text, context),
        temperature: 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`Command classifier failed: ${response.status}`);
    }

    const data = await response.json();
    const outputText = data.output_text || data.output?.[0]?.content?.[0]?.text || '';
    const parsed = parseJsonObject(outputText);
    if (!parsed || typeof parsed !== 'object') return null;

    return {
      mode: parsed.mode === 'command' ? 'command' : 'chat',
      intent: typeof parsed.intent === 'string' ? parsed.intent : 'unknown',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : null,
      reply: typeof parsed.reply === 'string' ? parsed.reply : '',
      missing: Array.isArray(parsed.missing) ? parsed.missing.filter((value) => typeof value === 'string') : [],
      entities: parsed.entities && typeof parsed.entities === 'object' ? parsed.entities : {},
      pendingCommand: parsed.pendingCommand && typeof parsed.pendingCommand === 'object' ? parsed.pendingCommand : null,
    };
  } catch (error) {
    console.error('Zentrixa classifier error:', error);
    return null;
  }
};

export async function getOpenAIChatReply({ user, text, context = {} }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const fallback = 'I’m here with you. Tell me what you need, and I’ll help however I can.';
    return fallback;
  }

  const requestBody = JSON.stringify({
    model: OPENAI_MODEL,
    input: buildChatMessages(user, text, context),
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: requestBody,
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(`OpenAI chat failed: ${response.status} ${message}`);
      }

      const data = await response.json();
      const textOutput = data.output_text || data.output?.[0]?.content?.[0]?.text || '';
      return normalize(textOutput) || 'I’m here with you. Tell me what you need, and I’ll help however I can.';
    } catch (error) {
      if (attempt === 1) {
        console.error('OpenAI chat error:', error);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  return 'I’m here with you. Tell me what you need, and I’ll help however I can.';
}

const formatProjectResponse = (project, verb) => {
  if (!project) return `I couldn't complete that project action.`;
  if (verb === 'create') return `Project ${project.name} created.`;
  if (verb === 'delete') return `Project ${project.name} deleted.`;
  if (verb === 'rename') return `Project renamed to ${project.name}.`;
  return `Project ${project.name} updated.`;
};

const formatTaskResponse = (task, message) => {
  if (message) return message;
  if (!task) return 'Task updated.';
  return `${task.title} updated.`;
};

const ensureRole = (user, intent) => {
  const message = ROLE_MESSAGES[intent];
  if (!message) return null;
  if (user?.role === 'admin') return null;
  return message;
};

const findProjectByName = async (projectName) => {
  if (!projectName) return null;
  return Project.findOne({ name: buildRegex(projectName) });
};

const findUserByName = async (userName) => {
  if (!userName) return null;
  const trimmed = normalize(userName);
  const emailMatch = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
  return User.findOne({
    $or: [
      { name: buildRegex(trimmed) },
      ...(emailMatch ? [{ email: new RegExp(`^${escapeRegExp(emailMatch)}$`, 'i') }] : []),
    ],
  }).select('_id name email role');
};

const findTaskByName = async ({ taskName, projectId }) => {
  const query = {};
  if (taskName) query.title = buildRegex(taskName);
  if (projectId) query.projectId = projectId;
  return Task.findOne(query)
    .populate('projectId', 'name')
    .populate('assignedDeveloper', 'name email role')
    .populate('createdBy', 'name email role');
};

const extractProjectNameHint = (text = '') => {
  const normalized = normalize(text);
  if (!normalized) return '';

  const patterns = [
    /(?:create|make|start|build)\s+(?:a\s+|the\s+)?project\s+(.+?)(?:\s+for\b|\s+in\b|\s+on\b|$)/i,
    /(?:new\s+project)\s+(.+?)(?:\s+for\b|\s+in\b|\s+on\b|$)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return match[1]
        .replace(/\b(project|task|board|card)\b/gi, '')
        .replace(/\b(my|this|that|the|a|an)\b/gi, '')
        .trim();
    }
  }

  return '';
};

const findTaskByIdSafe = async (taskId) => {
  if (!taskId || !isObjectId(taskId)) return null;
  return Task.findById(taskId)
    .populate('projectId', 'name')
    .populate('assignedDeveloper', 'name email role')
    .populate('createdBy', 'name email role');
};

const queryOverdueTasks = async ({ projectId, user }) => {
  const query = {
    deadline: { $lt: new Date() },
    status: { $nin: ['completed', 'done'] },
  };

  if (projectId) query.projectId = projectId;
  if (user?.role === 'developer') {
    query.assignedDeveloper = user._id;
  }

  return Task.find(query)
    .populate('assignedDeveloper', 'name email role')
    .populate('projectId', 'name')
    .sort({ deadline: 1 });
};

const shouldConfirmIntent = (intent) => CONFIRMATION_INTENTS.has(intent);

const isAffirmativeCommand = (text = '') => /^(yes|yep|yeah|confirm|do it|doit|add|proceed|ok|okay|sure)$/i.test(normalize(text));

const isNegativeCommand = (text = '') => /^(no|nope|cancel|stop|never mind|nevermind|dont|don't)$/i.test(normalize(text));

const buildActionMessage = ({ command, subject, target, verb }) => {
  const readableCommand = toCommandLabel(command);
  if (subject && target && verb) {
    return `${verb} ${subject} ${target}?`;
  }
  return `Confirm ${readableCommand}?`;
};

const buildPendingConfirmation = ({ command, payload, message, context = {} }) => ({
  executed: false,
  mode: 'command',
  type: 'CONFIRM',
  command: command.toUpperCase(),
  reply: message,
  message,
  payload,
  pendingCommand: {
    ...payload,
    command: command.toUpperCase(),
    text: context.text || '',
  },
  requiresConfirmation: true,
});

const addDeveloperToProject = async ({ projectId, userId }) => {
  if (!projectId || !userId) {
    return { ok: false, message: 'projectId and userId are required.' };
  }

  const [project, developer] = await Promise.all([
    Project.findById(projectId).populate('developers', 'name email role'),
    User.findById(userId).select('_id name email role'),
  ]);

  if (!project) {
    return { ok: false, message: 'Project not found.' };
  }

  if (!developer || developer.role !== 'developer') {
    return { ok: false, message: 'Developer not found.' };
  }

  const projectDevelopers = Array.isArray(project.developers) ? project.developers : [];
  const alreadyMember = projectDevelopers.some((member) => member?._id?.toString?.() === developer._id.toString() || member?.toString?.() === developer._id.toString());
  if (alreadyMember) {
    return {
      ok: true,
      executed: false,
      reply: `${formatName(developer)} is already part of ${project.name} project.`,
      project,
      developer,
    };
  }

  await Promise.all([
    Project.updateOne(
      { _id: projectId },
      { $addToSet: { developers: developer._id } }
    ),
    User.updateOne(
      { _id: developer._id },
      { $addToSet: { joinedProjects: projectId } }
    ),
    ProjectRequest.deleteMany({
      projectId,
      developerId: developer._id,
    }),
  ]);

  return {
    ok: true,
    executed: true,
    reply: `${formatName(developer)} has been added to ${project.name} project.`,
    project,
    developer,
  };
};

const executeConfirmedCommand = async ({ user, text, context = {}, payload = {} }) => {
  const command = normalizeCommandKey(payload.command || payload.intent || payload.action);
  if (!command) {
    return { executed: false, mode: 'command', reply: 'I could not confirm that action.' };
  }

  if (command === 'add_member') {
    const result = await addDeveloperToProject({
      projectId: payload.projectId || payload.project_id || context.projectId,
      userId: payload.userId || payload.user_id || context.userId,
    });
    return {
      executed: result.executed !== false,
      mode: 'command',
      reply: result.reply || 'Member added.',
    };
  }

  if (command === 'remove_member') {
    const result = await runController(removeProjectMember, {
      ...context,
      params: {
        id: (payload.projectId || payload.project_id || context.projectId || '').toString(),
        memberId: (payload.userId || payload.user_id || context.userId || '').toString(),
      },
      user,
      userId: user?._id,
      body: {},
    });
    return {
      executed: result.statusCode < 400,
      mode: 'command',
      reply: result.body?.message || 'Member removed.',
    };
  }

  if (command === 'create_project') {
    const targetName = payload.name || payload.projectName || payload.project_name || context.name || context.projectName || '';
    const existingProject = targetName ? await Project.findOne({
      createdBy: user._id,
      name: new RegExp(`^${escapeRegExp(normalize(targetName))}$`, 'i'),
    }) : null;
    if (existingProject) {
      return {
        executed: false,
        mode: 'command',
        reply: `Project ${existingProject.name} already exists.`,
      };
    }

    const result = await runController(createProject, {
      ...context,
      user,
      userId: user?._id,
      body: {
        name: targetName,
        description: payload.description || context.description || '',
        githubRepository: payload.githubRepository || context.githubRepository || '',
      },
    });
    const project = result.body?.project || null;
    return {
      executed: result.statusCode < 400,
      mode: 'command',
      reply: project ? `Project ${project.name} created.` : result.body?.message || 'Project created.',
    };
  }

  if (command === 'delete_project') {
    const projectId = payload.projectId || payload.project_id || null;
    const result = await runController(deleteProject, {
      ...context,
      params: { id: projectId.toString() },
      user,
      userId: user?._id,
      body: {},
    });
    return {
      executed: result.statusCode < 400,
      mode: 'command',
      reply: result.body?.message || 'Project deleted.',
    };
  }

  if (command === 'rename_project') {
    const projectId = payload.projectId || payload.project_id || null;
    const result = await runController(updateProject, {
      ...context,
      params: { id: projectId.toString() },
      user,
      userId: user?._id,
      body: {
        name: payload.newName || payload.new_name || context.newName,
      },
    });
    const project = result.body?.project || null;
    return {
      executed: result.statusCode < 400,
      mode: 'command',
      reply: project ? formatProjectResponse(project, 'rename') : result.body?.message || 'Project renamed.',
    };
  }

  if (command === 'create_task') {
    const assigneeId = payload.userId || payload.user_id || context.developerId || null;
    const projectName = payload.projectName || context.projectName || '';
    const projectId = payload.projectId || payload.project_id || context.projectId || null;
    let panelId = payload.panelId || payload.panel_id || context.panelId || null;
    if (!panelId && projectId && isObjectId(projectId)) {
      const panels = await Panel.find({ projectId }).sort({ order: 1 });
      const todoPanel = panels.find((panel) => /(^|\b)(to\s*do|todo|pending|backlog)(\b|$)/i.test(panel.name)) || panels[0];
      panelId = todoPanel?._id || null;
    }
    const result = await runController(createTask, {
      ...context,
      user,
      userId: user?._id,
      body: {
        title: payload.title || payload.taskName || payload.task_name || context.title,
        description: payload.description || context.description || '',
        projectId,
        panelId,
        assignedDeveloper: assigneeId || payload.assignedDeveloper || null,
        priority: payload.priority || context.priority || 'medium',
        deadline: payload.deadline || context.deadline,
      },
    });
    const task = result.body?.task || null;
    const assignee = payload.userName || (assigneeId ? await User.findById(assigneeId).select('name email') : null);
    return {
      executed: result.statusCode < 400,
      mode: 'command',
      reply: task
        ? assignee
          ? `Task ${task.title} created in ${projectName || 'the project'} and assigned to ${formatName(assignee)}.`
          : `Task ${task.title} created in ${projectName || 'the project'}.`
        : result.body?.message || 'Task created.',
    };
  }

  if (command === 'delete_task') {
    const taskTitleHint = payload.taskName || payload.task_name || context.taskName || text;
    const searchProjectId = payload.projectId || payload.project_id || context.projectId || null;
    const candidateTasks = taskTitleHint
      ? await Task.find({
          title: buildRegex(taskTitleHint),
          ...(searchProjectId ? { projectId: searchProjectId } : {}),
        })
        .populate('projectId', 'name')
        .populate('assignedDeveloper', 'name email')
        .sort({ updatedAt: -1 })
        .limit(10)
      : [];

    if (!candidateTasks.length) {
      return {
        executed: false,
        mode: 'command',
        reply: taskTitleHint
          ? `I could not find a task matching "${taskTitleHint}".`
          : 'I need the exact task name before deleting it.',
        requiresClarification: true,
        pendingCommand: { intent, task_name: taskTitleHint, project_name: projectName, text },
      };
    }

    const selectedTask = candidateTasks[0];
    return buildPendingConfirmation({
      command: 'DELETE_TASK',
      context: { text },
      message: `Delete task ${selectedTask.title} from ${selectedTask.projectId?.name || projectName || 'this project'}?`,
      payload: {
        command: 'DELETE_TASK',
        taskId: selectedTask._id.toString(),
        taskName: selectedTask.title,
        projectId: selectedTask.projectId?._id?.toString?.() || searchProjectId?.toString?.() || null,
        projectName: selectedTask.projectId?.name || projectName || '',
      },
    });
  }

  if (command === 'assign_task') {
    const result = await runController(updateTask, {
      ...context,
      params: { id: (payload.taskId || payload.task_id || context.taskId || '').toString() },
      user,
      userId: user?._id,
      body: {
        assignedDeveloper: payload.userId || payload.user_id || context.developerId,
      },
    });
    const task = result.body?.task || null;
    return {
      executed: result.statusCode < 400,
      mode: 'command',
      reply: task ? `${formatTaskTitle(task)} assigned.` : result.body?.message || 'Task assigned.',
    };
  }

  if (command === 'move_task') {
    const result = await runController(updateTaskStatus, {
      ...context,
      params: { id: (payload.taskId || payload.task_id || context.taskId || '').toString() },
      user,
      userId: user?._id,
      body: {
        status: payload.status || context.status || 'in-progress',
        panelId: payload.panelId || payload.panel_id || context.panelId,
      },
    });
    return {
      executed: result.statusCode < 400,
      mode: 'command',
      reply: result.body?.message || 'Task updated.',
    };
  }

  if (command === 'update_task') {
    const result = await runController(updateTask, {
      ...context,
      params: { id: (payload.taskId || payload.task_id || context.taskId || '').toString() },
      user,
      userId: user?._id,
      body: {
        title: payload.title || context.title,
        description: payload.description || context.description,
        deadline: payload.deadline || context.deadline,
        priority: payload.priority || context.priority,
      },
    });
    const task = result.body?.task || null;
    return {
      executed: result.statusCode < 400,
      mode: 'command',
      reply: formatTaskResponse(task, result.body?.message),
    };
  }

  if (command === 'comment_task') {
    const result = await runController(addTaskComment, {
      ...context,
      params: { id: (payload.taskId || payload.task_id || context.taskId || '').toString() },
      user,
      userId: user?._id,
      body: {
        content: payload.comment || payload.content || payload.text || context.comment || text,
      },
    });
    return {
      executed: result.statusCode < 400,
      mode: 'command',
      reply: result.body?.message || 'Comment added.',
    };
  }

  if (command === 'update_deadline') {
    const result = await runController(updateTask, {
      ...context,
      params: { id: (payload.taskId || payload.task_id || context.taskId || '').toString() },
      user,
      userId: user?._id,
      body: {
        deadline: payload.deadline || context.deadline,
      },
    });
    return {
      executed: result.statusCode < 400,
      mode: 'command',
      reply: result.body?.message || 'Deadline updated.',
    };
  }

  return { executed: false, mode: 'command', reply: 'I could not confirm that action.' };
};

const executeCommand = async ({ user, text, context = {}, intent, entities = {}, projectId, taskId }) => {
  const permissionError = ensureRole(user, intent);
  if (permissionError) {
    return { executed: false, mode: 'command', reply: permissionError };
  }

  const pendingCommand = context.pendingCommand && typeof context.pendingCommand === 'object' ? context.pendingCommand : {};
  const projectName = entities.project_name || pendingCommand.project_name || context.projectName || '';
  const taskName = entities.task_name || pendingCommand.task_name || context.taskName || '';
  const userName = entities.user_name || pendingCommand.user_name || context.userName || '';
  const statusName = entities.status || pendingCommand.status || context.status || '';
  const targetTaskId = taskId || context.taskId || pendingCommand.task_id || null;

  const resolvedProject = await findProjectByName(projectName);
  const resolvedUser = await findUserByName(userName);
  const resolvedTask = targetTaskId
    ? await findTaskByIdSafe(targetTaskId)
    : taskName
      ? await findTaskByName({
        taskName,
        projectId: projectId || context.projectId || resolvedProject?._id,
      })
      : null;

  if (intent === 'show_delayed') {
    const delayedTasks = await queryOverdueTasks({
      projectId: projectId || context.projectId || resolvedProject?._id,
      user,
    });
    const count = delayedTasks.length;
    return {
      executed: true,
      mode: 'command',
      reply: count === 1 ? 'You have 1 overdue task.' : `You have ${count} overdue tasks.`,
    };
  }

  if (shouldConfirmIntent(intent)) {
    const targetProjectId = projectId || context.projectId || resolvedProject?._id;
    const targetTaskId = taskId || context.taskId || resolvedTask?._id;
    const command = intent.toUpperCase();

    if (intent === 'create_project') {
      const projectName = extractProjectNameHint(text) || entities.project_name || pendingCommand.project_name || context.name || context.projectName || '';
      if (!projectName) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I need a project name before I can create it.',
          requiresClarification: true,
          pendingCommand: { intent, project_name: projectName, text },
        };
      }
      return buildPendingConfirmation({
        command,
        context: { text },
        message: `Create project ${projectName}?`,
        payload: {
          command,
          name: projectName,
          description: context.description || '',
          githubRepository: context.githubRepository || '',
        },
      });
    }

    if (intent === 'delete_project') {
      if (!targetProjectId) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I need the project name before I can delete it.',
          requiresClarification: true,
          pendingCommand: { intent, project_name: projectName, text },
        };
      }
      const project = resolvedProject || (targetProjectId ? await Project.findById(targetProjectId) : null);
      if (!project) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I could not find the project to delete.',
        };
      }
      return buildPendingConfirmation({
        command,
        context: { text },
        message: `Delete project ${project.name}?`,
        payload: {
          command,
          projectId: project._id.toString(),
          name: project.name,
        },
      });
    }

    if (intent === 'rename_project') {
      const project = resolvedProject || (targetProjectId ? await Project.findById(targetProjectId) : null);
      const newName = context.newName || entities.new_name || entities.project_name || pendingCommand.new_name || projectName || '';
      if (!project) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I could not find the project to rename.',
        };
      }
      if (!newName) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I need the new project name before I can rename it.',
          requiresClarification: true,
          pendingCommand: { intent, project_name: project.name, new_name: '', text },
        };
      }
      return buildPendingConfirmation({
        command,
        context: { text },
        message: `Rename ${project.name} to ${newName}?`,
        payload: {
          command,
          projectId: project._id.toString(),
          newName,
        },
      });
    }

    if (intent === 'add_member') {
      if (!targetProjectId || !resolvedUser?._id) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I need a project and a person before I can add them.',
          requiresClarification: true,
          pendingCommand: { intent, user_name: userName, project_name: projectName, text },
        };
      }
      const project = resolvedProject || (targetProjectId ? await Project.findById(targetProjectId).populate('developers', 'name email role') : null);
      if (!project) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I could not find the project to update.',
        };
      }
      const memberAlreadyAdded = Array.isArray(project.developers) && project.developers.some((member) => member?._id?.toString?.() === resolvedUser._id.toString() || member?.toString?.() === resolvedUser._id.toString());
      if (memberAlreadyAdded) {
        return {
          executed: true,
          mode: 'command',
          reply: `${formatName(resolvedUser)} is already part of ${project.name} project.`,
        };
      }
      return buildPendingConfirmation({
        command,
        context: { text },
        message: `Add ${formatName(resolvedUser)} to ${project.name} project?`,
        payload: {
          command,
          userId: resolvedUser._id.toString(),
          projectId: project._id.toString(),
          userName: formatName(resolvedUser),
          projectName: project.name,
        },
      });
    }

    if (intent === 'remove_member') {
      if (!targetProjectId || !resolvedUser?._id) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I need a project and a member before I can remove them.',
          requiresClarification: true,
          pendingCommand: { intent, user_name: userName, project_name: projectName, text },
        };
      }
      const project = resolvedProject || (targetProjectId ? await Project.findById(targetProjectId).populate('developers', 'name email role') : null);
      if (!project) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I could not find the project to update.',
        };
      }
      return buildPendingConfirmation({
        command,
        context: { text },
        message: `Remove ${formatName(resolvedUser)} from ${project.name} project?`,
        payload: {
          command,
          userId: resolvedUser._id.toString(),
          projectId: project._id.toString(),
          userName: formatName(resolvedUser),
          projectName: project.name,
        },
      });
    }

    if (intent === 'create_task') {
      if (!targetProjectId) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I need a project before I can create that task. Tell me which project to use.',
          requiresClarification: true,
          pendingCommand: { intent, task_name: taskName, project_name: projectName },
        };
      }
      const project = resolvedProject || (targetProjectId ? await Project.findById(targetProjectId) : null);
      if (!project) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I could not find the project to add that task to.',
        };
      }
      const title = context.title || taskName || entities.task_name || text;
      const assigneeName = entities.user_name || pendingCommand.user_name || context.userName || '';
      const assigneeLabel = resolvedUser?._id ? formatName(resolvedUser) : assigneeName;
      return buildPendingConfirmation({
        command,
        context: { text },
        message: assigneeLabel
          ? `Create task ${title} in ${project.name} and assign it to ${assigneeLabel}?`
          : `Create task ${title} in ${project.name}?`,
        payload: {
          command,
          title,
          description: context.description || '',
          projectId: project._id.toString(),
          projectName: project.name,
          panelId: context.panelId || null,
          userId: resolvedUser?._id?.toString?.() || null,
          userName: assigneeLabel || null,
          priority: context.priority || 'medium',
          deadline: context.deadline || null,
        },
      });
    }

    if (intent === 'assign_task') {
      if (!targetTaskId) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I could not find the task to assign. Tell me the task name or project.',
          requiresClarification: true,
          pendingCommand: { intent, task_name: taskName, project_name: projectName, user_name: userName },
        };
      }
      if (!resolvedUser?._id) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I need the teammate name before I can assign it.',
          requiresClarification: true,
          pendingCommand: { intent, task_name: taskName, project_name: projectName, user_name: userName },
        };
      }
      const task = resolvedTask || (targetTaskId ? await findTaskByIdSafe(targetTaskId) : null);
      if (!task) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I could not find the task to assign.',
        };
      }
      return buildPendingConfirmation({
        command,
        context: { text },
        message: `Assign ${formatTaskTitle(task)} to ${formatName(resolvedUser)}?`,
        payload: {
          command,
          taskId: task._id.toString(),
          userId: resolvedUser._id.toString(),
          taskName: task.title,
          userName: formatName(resolvedUser),
        },
      });
    }

    if (intent === 'move_task') {
      if (!targetTaskId) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I could not find the task to update. Tell me the task or project name.',
          requiresClarification: true,
          pendingCommand: { intent, task_name: taskName, project_name: projectName, status: statusName },
        };
      }
      const task = resolvedTask || (targetTaskId ? await findTaskByIdSafe(targetTaskId) : null);
      if (!task) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I could not find the task to update.',
        };
      }
      const nextStatus = statusName || context.status || 'in-progress';
      return buildPendingConfirmation({
        command,
        context: { text },
        message: `Move ${formatTaskTitle(task)} to ${nextStatus}?`,
        payload: {
          command,
          taskId: task._id.toString(),
          status: nextStatus,
          taskName: task.title,
        },
      });
    }

    if (intent === 'update_task') {
      if (!targetTaskId) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I could not find the task to update. Tell me the task or project name.',
          requiresClarification: true,
          pendingCommand: { intent, task_name: taskName, project_name: projectName },
        };
      }
      const task = resolvedTask || (targetTaskId ? await findTaskByIdSafe(targetTaskId) : null);
      if (!task) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I could not find the task to update.',
        };
      }
      const renamedTitle = entities.new_name || context.title || task.title;
      return buildPendingConfirmation({
        command,
        context: { text },
        message: renamedTitle && renamedTitle !== task.title
          ? `Rename ${formatTaskTitle(task)} to ${renamedTitle}?`
          : `Update ${formatTaskTitle(task)}?`,
        payload: {
          command,
          taskId: task._id.toString(),
          title: renamedTitle,
          newName: entities.new_name || null,
          description: context.description,
          deadline: context.deadline,
          priority: context.priority,
        },
      });
    }

    if (intent === 'comment_task') {
      if (!targetTaskId) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I could not find the task to comment on.',
          requiresClarification: true,
          pendingCommand: { intent, task_name: taskName, project_name: projectName, comment: context.comment || text },
        };
      }
      const task = resolvedTask || (targetTaskId ? await findTaskByIdSafe(targetTaskId) : null);
      if (!task) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I could not find the task to comment on.',
        };
      }
      const comment = context.comment || context.message || text;
      return buildPendingConfirmation({
        command,
        context: { text },
        message: `Add this comment to ${formatTaskTitle(task)}?`,
        payload: {
          command,
          taskId: task._id.toString(),
          comment,
          taskName: task.title,
        },
      });
    }

    if (intent === 'update_deadline') {
      if (!targetTaskId) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I could not find the task for that deadline. Tell me the task name.',
          requiresClarification: true,
          pendingCommand: { intent, task_name: taskName, project_name: projectName, deadline: context.deadline || entities.deadline || context.date },
        };
      }
      const task = resolvedTask || (targetTaskId ? await findTaskByIdSafe(targetTaskId) : null);
      if (!task) {
        return {
          executed: false,
          mode: 'command',
          reply: 'I could not find the task for that deadline.',
        };
      }
      const deadline = context.deadline || entities.deadline || context.date;
      return buildPendingConfirmation({
        command,
        context: { text },
        message: `Update the deadline for ${formatTaskTitle(task)}?`,
        payload: {
          command,
          taskId: task._id.toString(),
          deadline,
          taskName: task.title,
        },
      });
    }
  }

  if (intent === 'create_project') {
    const targetName = extractProjectNameHint(text) || entities.project_name || pendingCommand.project_name || context.name || projectName || taskName || '';
    if (!targetName) {
      return {
        executed: false,
        mode: 'command',
        reply: 'I need a project name before I can create it.',
        requiresClarification: true,
        pendingCommand: { intent, project_name: '', text },
      };
    }
    const existingProject = await Project.findOne({
      createdBy: user._id,
      name: new RegExp(`^${escapeRegExp(normalize(targetName))}$`, 'i'),
    });
    if (existingProject) {
      return {
        executed: false,
        mode: 'command',
        reply: `Project ${existingProject.name} already exists.`,
      };
    }
    const result = await runController(createProject, {
      ...context,
      user,
      userId: user._id,
      body: {
        name: targetName,
        description: context.description || '',
        githubRepository: context.githubRepository || '',
      },
    });
    const project = result.body?.project || null;
    return {
      executed: result.statusCode < 400,
      mode: 'command',
      reply: project ? `Project ${project.name} created.` : result.body?.message || 'Project created.',
    };
  }

  if (intent === 'delete_project') {
    if (!resolvedProject && !projectId) {
      return { executed: false, mode: 'command', reply: 'I need the project name before I can delete it.' };
    }
    const targetProjectId = resolvedProject?._id || projectId;
    const project = resolvedProject || (targetProjectId ? await Project.findById(targetProjectId) : null);
    if (project) {
      await runController(deleteProject, {
        ...context,
        params: { id: targetProjectId.toString() },
        user,
        userId: user._id,
        body: {},
      });
    }
    return { executed: true, mode: 'command', reply: project ? `Project ${project.name} deleted.` : 'Project deleted.' };
  }

  if (intent === 'rename_project') {
    const targetProjectId = resolvedProject?._id || projectId;
    const project = resolvedProject || (targetProjectId ? await Project.findById(targetProjectId) : null);
    const newName = context.newName || entities.new_name || entities.project_name || pendingCommand.new_name || projectName || '';
    if (!project) {
      return { executed: false, mode: 'command', reply: 'I could not find the project to rename.' };
    }
    if (!newName) {
      return {
        executed: false,
        mode: 'command',
        reply: 'I need the new project name before I can rename it.',
        requiresClarification: true,
        pendingCommand: { intent, project_name: project.name, new_name: '', text },
      };
    }
    const result = await runController(updateProject, {
      ...context,
      params: { id: targetProjectId.toString() },
      user,
      userId: user._id,
      body: {
        name: newName,
        description: context.description,
        githubRepository: context.githubRepository,
        status: context.status,
      },
    });
    const updatedProject = result.body?.project || project;
    return { executed: true, mode: 'command', reply: formatProjectResponse(updatedProject, 'rename') };
  }

  if (intent === 'analyze_project') {
    const targetProjectId = resolvedProject?._id || projectId || context.projectId || null;
    if (!targetProjectId) {
      return {
        executed: false,
        mode: 'command',
        reply: 'I need a project name before I can show a summary.',
        requiresClarification: true,
        pendingCommand: { intent, project_name: projectName, text },
      };
    }
    const summary = await buildProjectSummary(targetProjectId);
    if (!summary) {
      return {
        executed: false,
        mode: 'command',
        reply: 'I could not find that project.',
      };
    }
    const { project, total, completed, inProgress, pending, review, progress } = summary;
    const description = project.description?.trim() || 'No description added yet.';
    return {
      executed: true,
      mode: 'command',
      reply: `${project.name} is ${progress}% complete. ${description} It has ${total} tasks: ${completed} done, ${inProgress} in progress, ${review} in review, and ${pending} pending.`,
      projectId: project._id.toString(),
      projectName: project.name,
    };
  }

  if (intent === 'add_member') {
    const targetProjectId = projectId || context.projectId || resolvedProject?._id;
    if (!targetProjectId || !resolvedUser?._id) {
      return { executed: false, mode: 'command', reply: 'I need a project and a person to invite.' };
    }
    const result = await runController(inviteDeveloper, {
      ...context,
      params: { id: targetProjectId.toString() },
      user,
      userId: user._id,
      body: {
        developerId: resolvedUser._id,
        message: context.message || `You have been invited to join the project.`,
      },
    });
    return {
      executed: result.statusCode < 400,
      mode: 'command',
      reply: result.body?.message || `Invitation sent to ${formatName(resolvedUser)}.`,
    };
  }

  if (intent === 'remove_member') {
    const targetProjectId = projectId || context.projectId || resolvedProject?._id;
    if (!targetProjectId || !resolvedUser?._id) {
      return { executed: false, mode: 'command', reply: 'I need a project and a member to remove.' };
    }
    const result = await runController(removeProjectMember, {
      ...context,
      params: { id: targetProjectId.toString(), memberId: resolvedUser._id.toString() },
      user,
      userId: user._id,
      body: {},
    });
    return {
      executed: result.statusCode < 400,
      mode: 'command',
      reply: result.body?.message || `${formatName(resolvedUser)} removed from the project.`,
    };
  }

  if (intent === 'create_task') {
    const targetProjectId = projectId || context.projectId || resolvedProject?._id;
    if (!targetProjectId) {
      return {
        executed: false,
        mode: 'command',
        reply: 'I need a project before I can create that task. Tell me which project to use.',
        requiresClarification: true,
        pendingCommand: { intent, task_name: taskName, project_name: projectName },
      };
    }
    if (user?.role !== 'admin' && user?.role !== 'developer') {
      return { executed: false, mode: 'command', reply: "You don't have permission to create task. Ask admin." };
    }
    const panels = await Panel.find({ projectId: targetProjectId }).sort({ order: 1 });
    const todoPanel = panels.find((panel) => /(^|\b)(to\s*do|todo|pending|backlog)(\b|$)/i.test(panel.name)) || panels[0];
    const result = await runController(createTask, {
      ...context,
      user,
      userId: user._id,
      body: {
        title: context.title || taskName || text,
        description: context.description || '',
        projectId: targetProjectId,
        panelId: context.panelId || todoPanel?._id,
        assignedDeveloper: resolvedUser?._id,
        priority: context.priority || 'medium',
        deadline: context.deadline,
      },
    });
    const task = result.body?.task || null;
    return {
      executed: result.statusCode < 400,
      mode: 'command',
      reply: task ? `Task ${task.title} created.` : result.body?.message || 'Task created.',
    };
  }

  if (intent === 'assign_task') {
    const targetTask = resolvedTask;
    if (!targetTask) {
      const targetProjectId = projectId || context.projectId || resolvedProject?._id;
      if (targetProjectId && resolvedUser?._id) {
        const inviteResult = await runController(inviteDeveloper, {
          ...context,
          params: { id: targetProjectId.toString() },
          user,
          userId: user._id,
          body: {
            developerId: resolvedUser._id,
            message: `You have been invited to join the project.`,
          },
        });

        return {
          executed: inviteResult.statusCode < 400,
          mode: 'command',
          reply: inviteResult.body?.message || `${formatName(resolvedUser)} added to the project.`,
        };
      }

      return {
        executed: false,
        mode: 'command',
        reply: 'I could not find the task to assign. Tell me the task name or project.',
        requiresClarification: true,
        pendingCommand: { intent, task_name: taskName, project_name: projectName, user_name: userName },
      };
    }
    if (!resolvedUser?._id) {
      return {
        executed: false,
        mode: 'command',
        reply: 'I need the teammate name before I can assign it.',
        requiresClarification: true,
        pendingCommand: { intent, task_name: taskName, project_name: projectName, user_name: userName },
      };
    }
    const result = await runController(updateTask, {
      ...context,
      params: { id: targetTask._id.toString() },
      user,
      userId: user._id,
      body: {
        assignedDeveloper: resolvedUser?._id,
      },
    });
    const task = result.body?.task || targetTask;
    return {
      executed: result.statusCode < 400,
      mode: 'command',
      reply: `${formatTaskTitle(task)} assigned to ${formatName(resolvedUser)}.`,
    };
  }

  if (intent === 'move_task' || intent === 'update_task') {
    const targetTask = resolvedTask;
    if (!targetTask) {
      return {
        executed: false,
        mode: 'command',
        reply: 'I could not find the task to update. Tell me the task or project name.',
        requiresClarification: true,
        pendingCommand: { intent, task_name: taskName, project_name: projectName, status: statusName },
      };
    }

    if (intent === 'move_task' || statusName) {
      const result = await runController(updateTaskStatus, {
        ...context,
        params: { id: targetTask._id.toString() },
        user,
        userId: user._id,
        body: {
          status: statusName || 'in-progress',
          panelId: context.panelId,
          order: context.order,
        },
      });
      return {
        executed: result.statusCode < 400,
        mode: 'command',
        reply: result.body?.message || `${formatTaskTitle(targetTask)} updated.`,
      };
    }

    const result = await runController(updateTask, {
      ...context,
      params: { id: targetTask._id.toString() },
      user,
      userId: user._id,
      body: {
        title: context.title || context.newName || entities.new_name,
        description: context.description,
        deadline: context.deadline,
        priority: context.priority,
      },
    });
    const task = result.body?.task || targetTask;
    return {
      executed: result.statusCode < 400,
      mode: 'command',
      reply: formatTaskResponse(task, result.body?.message),
    };
  }

  if (intent === 'comment_task') {
    const targetTask = resolvedTask;
    if (!targetTask) {
      return { executed: false, mode: 'command', reply: 'I could not find the task to comment on.' };
    }
    const commentText = context.comment || context.message || text;
    const result = await runController(addTaskComment, {
      ...context,
      params: { id: targetTask._id.toString() },
      user,
      userId: user._id,
      body: {
        content: commentText,
      },
    });
    return {
      executed: result.statusCode < 400,
      mode: 'command',
      reply: result.body?.message || 'Comment added.',
    };
  }

  if (intent === 'update_deadline') {
    const targetTask = resolvedTask || (taskId ? await Task.findById(taskId) : null);
    if (!targetTask) {
      return {
        executed: false,
        mode: 'command',
        reply: 'I could not find the task for that deadline. Tell me the task name.',
        requiresClarification: true,
        pendingCommand: { intent, task_name: taskName, project_name: projectName, deadline: context.deadline || entities.deadline || context.date },
      };
    }
    const result = await runController(updateTask, {
      ...context,
      params: { id: targetTask._id.toString() },
      user,
      userId: user._id,
      body: {
        deadline: context.deadline || entities.deadline || context.date,
      },
    });
    return {
      executed: result.statusCode < 400,
      mode: 'command',
      reply: result.body?.message || `${formatTaskTitle(targetTask)} deadline updated.`,
    };
  }

  return { executed: false, mode: 'command', reply: 'I couldn’t work out that command.' };
};

export async function handleZentrixaMessage(req, res) {
  try {
    const {
      text = '',
      message = '',
      context = {},
      entities = {},
      taskId,
      projectId,
    } = req.body || {};
    const cleaned = normalize(text || message);

    if (!cleaned) {
      return res.status(400).json({ executed: false, mode: 'chat', reply: 'Say something and I’ll help.' });
    }

    const pendingCommand = context.pendingCommand && typeof context.pendingCommand === 'object' ? context.pendingCommand : null;
    const classified = await classifyZentrixaMessage({
      user: req.user,
      text: cleaned,
      context: { ...context, pendingCommand },
    });

    const heuristicIntent = detectIntent(cleaned);
    const rawIntent = classified?.intent && classified.intent !== 'unknown'
      ? classified.intent
      : pendingCommand?.intent || heuristicIntent;
    const intent = looksLikeProjectMembershipRequest({
      text: cleaned,
      intent: rawIntent,
      entities: { ...entities, ...(classified?.entities || {}) },
      context,
    }) ? 'add_member' : rawIntent;
    const generalChat = isGeneralChat(cleaned)
      || (classified ? classified.mode === 'chat' && heuristicIntent === 'unknown' && intent === 'unknown' : intent === 'unknown')
      || (classified?.intent === 'unknown' && !pendingCommand && heuristicIntent === 'unknown');
    const extractedEntities = extractEntities(cleaned, intent);
    const mergedEntities = {
      ...extractedEntities,
      ...entities,
      ...(classified?.entities || {}),
    };

    if (generalChat) {
      const reply = classified?.reply || await getOpenAIChatReply({ user: req.user, text: cleaned, context });
      await Promise.all([
        saveZentrixaMessage({
          userId: req.user?._id,
          role: 'user',
          content: cleaned,
          mode: 'chat',
          intent: 'unknown',
          projectId: context.projectId || projectId || null,
          taskId: context.taskId || taskId || null,
          metadata: { context },
        }),
        saveZentrixaMessage({
          userId: req.user?._id,
          role: 'assistant',
          content: reply,
          mode: 'chat',
          intent: 'unknown',
          projectId: context.projectId || projectId || null,
          taskId: context.taskId || taskId || null,
          metadata: { context },
        }),
      ]);
      return res.json({
        executed: true,
        mode: 'chat',
        reply,
        message: reply,
      });
    }

    await saveZentrixaMessage({
      userId: req.user?._id,
      role: 'user',
      content: cleaned,
      mode: 'command',
      intent,
      projectId: context.projectId || projectId || null,
      taskId: context.taskId || taskId || null,
        metadata: { context, entities },
      });

    let result;
    try {
      result = await executeCommand({
        user: req.user,
        text: cleaned,
        context: { ...context, pendingCommand },
        intent,
        entities: mergedEntities,
        taskId: taskId || context.taskId,
        projectId: projectId || context.projectId,
      });
    } catch (commandError) {
      console.error('Zentrixa command error:', commandError);
      await saveZentrixaMessage({
        userId: req.user?._id,
        role: 'assistant',
        content: "I hit a snag while handling that. Give me the task or project name again and I’ll try once more.",
        mode: 'command',
        intent,
        projectId: context.projectId || projectId || null,
        taskId: context.taskId || taskId || null,
        metadata: { error: commandError?.message || 'unknown' },
      });
      return res.json({
        executed: false,
        mode: 'command',
        intent,
        reply: "I hit a snag while handling that. Give me the task or project name again and I’ll try once more.",
        message: "I hit a snag while handling that. Give me the task or project name again and I’ll try once more.",
      });
    }

    if (!result.executed && result.reply && /don't have permission/i.test(result.reply)) {
      await saveZentrixaMessage({
        userId: req.user?._id,
        role: 'assistant',
        content: result.reply,
        mode: 'command',
        intent,
        projectId: context.projectId || projectId || null,
        taskId: context.taskId || taskId || null,
        metadata: { executed: false, permissionDenied: true },
      });
      return res.status(403).json({
        executed: false,
        mode: 'command',
        intent,
        reply: result.reply,
        message: result.reply,
      });
    }

    await saveZentrixaMessage({
      userId: req.user?._id,
      role: 'assistant',
      content: result.reply,
      mode: result.mode || 'command',
      intent,
      projectId: result.projectId || context.projectId || projectId || null,
      taskId: result.task?.id || context.taskId || taskId || null,
      metadata: {
        entities,
        executed: result.executed,
      },
    });

    return res.json({
      ...result,
      intent,
      message: result.reply,
      pendingCommand: result.pendingCommand || classified?.pendingCommand || null,
      requiresClarification: Boolean(result.requiresClarification || (classified && classified.mode === 'command' && classified.missing?.length)),
      missing: result.missing || classified?.missing || [],
    });
  } catch (error) {
    console.error('Zentrixa message error:', error);
    return res.status(500).json({
      executed: false,
      mode: 'chat',
      reply: 'I hit a snag, but I’m still here.',
      message: 'I hit a snag, but I’m still here.',
    });
  }
}

export async function handleZentrixaConfirm(req, res) {
  try {
    const { confirmed = false, payload = {}, context = {}, text = '' } = req.body || {};
    const command = normalizeCommandKey(payload.command || payload.intent || payload.action);

    if (!command) {
      return res.status(400).json({
        executed: false,
        mode: 'command',
        reply: 'I could not confirm that action.',
        message: 'I could not confirm that action.',
      });
    }

    const confirmationText = normalize(text) || (confirmed ? 'yes' : 'cancel');

    await saveZentrixaMessage({
      userId: req.user?._id,
      role: 'user',
      content: confirmationText,
      mode: 'command',
      intent: command,
      projectId: payload.projectId || payload.project_id || context.projectId || null,
      taskId: payload.taskId || payload.task_id || context.taskId || null,
      metadata: { confirmed, payload, context },
    });

    if (!confirmed) {
      const reply = 'Okay, I didn’t make any changes.';
      await saveZentrixaMessage({
        userId: req.user?._id,
        role: 'assistant',
        content: reply,
        mode: 'command',
        intent: command,
        projectId: payload.projectId || payload.project_id || context.projectId || null,
        taskId: payload.taskId || payload.task_id || context.taskId || null,
        metadata: { confirmed: false, payload, context },
      });

      return res.json({
        executed: false,
        mode: 'command',
        command: command.toUpperCase(),
        reply,
        message: reply,
      });
    }

    const result = await executeConfirmedCommand({
      user: req.user,
      text: confirmationText,
      context,
      payload,
    });

    await saveZentrixaMessage({
      userId: req.user?._id,
      role: 'assistant',
      content: result.reply,
      mode: 'command',
      intent: command,
      projectId: payload.projectId || payload.project_id || context.projectId || null,
      taskId: payload.taskId || payload.task_id || context.taskId || null,
      metadata: {
        confirmed: true,
        payload,
        context,
        executed: result.executed,
      },
    });

    return res.json({
      ...result,
      command: command.toUpperCase(),
      message: result.reply,
      confirmed: true,
    });
  } catch (error) {
    console.error('Zentrixa confirm error:', error);
    return res.status(500).json({
      executed: false,
      mode: 'command',
      reply: 'I hit a snag while confirming that action.',
      message: 'I hit a snag while confirming that action.',
    });
  }
}

export async function getZentrixaMessages(req, res) {
  try {
    const limit = Number(req.query?.limit || 40);
    const messages = await getZentrixaHistory(req.user?._id, limit);
    return res.json({
      messages: messages.map((message) => ({
        id: message._id.toString(),
        role: message.role,
        content: message.content,
        mode: message.mode,
        intent: message.intent,
        projectId: message.projectId?._id?.toString?.() || message.projectId?.toString?.() || null,
        taskId: message.taskId?._id?.toString?.() || message.taskId?.toString?.() || null,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Zentrixa history error:', error);
    return res.status(500).json({
      message: 'Error fetching Zentrixa history',
      error: error.message,
    });
  }
}

export async function clearZentrixaNotifications(req, res) {
  try {
    const clearedIds = Array.isArray(req.body?.clearedIds) ? req.body.clearedIds.filter(Boolean) : [];

    const query = { userId: req.userId };
    if (clearedIds.length > 0) {
      query._id = { $in: clearedIds };
    } else {
      query.read = false;
    }

    const result = await Notification.deleteMany(query);
    return res.json({
      message: 'Notifications cleared',
      deletedCount: result.deletedCount || 0,
      clearedIds,
    });
  } catch (error) {
    console.error('Clear Zentrixa notifications error:', error);
    return res.status(500).json({ message: 'Error clearing notifications', error: error.message });
  }
}
