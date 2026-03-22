export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'developer';
  avatar?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  owner: User;
  members: ProjectMember[];
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

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasksCount: number;
}
