export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'developer';
  avatar?: string;
  createdAt: string;
  isTrialAdmin?: boolean;
  isPaidAdmin?: boolean;
  trialExpiresAt?: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  githubRepository?: string;
  status: 'active' | 'completed' | 'archived' | 'starred';
  /** True when the current user has starred this project */
  starred: boolean;
  owner: User;
  members: ProjectMember[];
  admins: User[];
  panels: Panel[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  user: User;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface Panel {
  id: string;
  name: string;
  order: number;
  projectId: string;
  width?: number;
  height?: number;
  tasks: Task[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: User;
  reporter: User;
  panelId: string;
  projectId: string;
  dueDate?: string;
  attachments: Attachment[];
  comments: Comment[];
  subtasks: Subtask[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  uploadedBy: User;
  uploadedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface ProjectRequest {
  id: string;
  project: Project;
  sender: User;
  recipient: User;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  sender?: User;
  taskId?: string;
  projectId?: string;
  type:
    | "due_date_updated"
    | "task_assigned"
    | "comment_mentioned"
    | "project_chat_dm"
    | "meeting_reminder"
    | "project_added"
    | "task_overdue"
    | "deadline_risk"
    | "morning_briefing"
    | "end_day_recap"
    | "focus_summary"
    | "need_help";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  sender: User;
  recipient?: User | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  projectId: string;
  createdBy: User;
  title: string;
  scheduledFor: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasksCount: number;
}
