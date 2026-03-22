"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Project, Panel, Task, ProjectRequest, User } from "./types";
import { useAuth } from "./auth-context";
import { apiRequest } from "./api";

interface DataContextType {
  projects: Project[];
  requests: ProjectRequest[];
  createProject: (data: CreateProjectData) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addPanel: (projectId: string, name: string) => Promise<Panel>;
  updatePanel: (projectId: string, panelId: string, name: string) => Promise<void>;
  deletePanel: (projectId: string, panelId: string) => Promise<void>;
  createTask: (data: CreateTaskData) => Promise<Task>;
  updateTask: (taskId: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, newPanelId: string) => Promise<void>;
  addComment: (taskId: string, content: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  sendInvitation: (projectId: string, email: string, message?: string) => Promise<void>;
  respondToRequest: (requestId: string, accept: boolean) => Promise<void>;
  getProjectById: (id: string) => Project | undefined;
  getTaskById: (id: string) => Task | undefined;
  getMyTasks: () => Task[];
}

interface CreateProjectData {
  name: string;
  description: string;
}

interface CreateTaskData {
  title: string;
  description: string;
  panelId: string;
  projectId: string;
  priority: Task["priority"];
  dueDate?: string;
  assigneeId?: string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);
const splitName = (name: string) => {
  const parts = (name || "").trim().split(/\s+/);
  return {
    firstName: parts[0] || "User",
    lastName: parts.slice(1).join(" ") || "",
  };
};

const mapApiUser = (user: { _id?: string; id?: string; name: string; email: string; role?: string }): User => {
  const { firstName, lastName } = splitName(user.name);
  return {
    id: (user.id || user._id || "").toString(),
    email: user.email,
    firstName,
    lastName,
    role: user.role === "admin" ? "admin" : "developer",
    createdAt: new Date().toISOString(),
  };
};

const mapTaskStatus = (status: string): Task["status"] => {
  if (status === "in-progress") return "in_progress";
  if (status === "review") return "review";
  if (status === "completed") return "done";
  return "todo";
};

const toApiTaskStatus = (status: Task["status"]): string => {
  if (status === "in_progress") return "in-progress";
  if (status === "review") return "review";
  if (status === "done") return "completed";
  return "pending";
};

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const loadProjects = async () => {
    if (!user) return;
    const projectResponse = await apiRequest<{ projects: Array<any> }>("/projects");
    const normalizedProjects = await Promise.all(
      projectResponse.projects.map(async (apiProject) => {
        const projectId = apiProject._id.toString();
        const [panelResponse, taskResponse] = await Promise.all([
          apiRequest<{ panels: Array<any> }>(`/panels/project/${projectId}`),
          apiRequest<{ tasks: Array<any> }>(`/tasks/project/${projectId}`),
        ]);

        const tasksByPanel: Record<string, Task[]> = {};
        const apiTasks = taskResponse.tasks || [];
        apiTasks.forEach((apiTask: any, index: number) => {
          const panelId = apiTask.panelId?.toString() || "";
          if (!tasksByPanel[panelId]) tasksByPanel[panelId] = [];
          tasksByPanel[panelId].push({
            id: apiTask._id.toString(),
            title: apiTask.title,
            description: apiTask.description || "",
            status: mapTaskStatus(apiTask.status),
            priority: apiTask.priority || "medium",
            assignee: apiTask.assignedDeveloper ? mapApiUser(apiTask.assignedDeveloper) : undefined,
            reporter: apiTask.createdBy ? mapApiUser(apiTask.createdBy) : user,
            panelId,
            projectId,
            dueDate: apiTask.deadline ? new Date(apiTask.deadline).toISOString() : undefined,
            attachments: [],
            comments: [],
            subtasks: [],
            order: index,
            createdAt: apiTask.createdAt || new Date().toISOString(),
            updatedAt: apiTask.updatedAt || new Date().toISOString(),
          });
        });

        const owner = apiProject.createdBy ? mapApiUser(apiProject.createdBy) : user;
        const developerMembers = (apiProject.developers || []).map((dev: any) => ({
          user: mapApiUser(dev),
          role: "member" as const,
          joinedAt: new Date().toISOString(),
        }));
        const members = [{ user: owner, role: "owner" as const, joinedAt: new Date().toISOString() }, ...developerMembers];

        return {
          id: projectId,
          name: apiProject.name,
          description: apiProject.description || "",
          status: apiProject.status || "active",
          owner,
          members,
          panels: (panelResponse.panels || []).map((p: any) => ({
            id: p._id.toString(),
            name: p.name,
            order: p.order || 0,
            projectId,
            tasks: tasksByPanel[p._id.toString()] || [],
          })),
          createdAt: apiProject.createdAt || new Date().toISOString(),
          updatedAt: apiProject.updatedAt || new Date().toISOString(),
        } as Project;
      })
    );
    setProjects(normalizedProjects);
  };

  const loadRequests = async () => {
    if (!user) return;
    const response = await apiRequest<{ requests: Array<any> }>("/requests/history");
    const normalized = (response.requests || []).map((r: any) => ({
      id: r._id.toString(),
      project: {
        id: r.projectId?._id?.toString() || "",
        name: r.projectId?.name || "Project",
        description: r.projectId?.description || "",
        status: "active" as const,
        owner: user,
        members: [],
        panels: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      sender: r.senderId ? mapApiUser(r.senderId) : user,
      recipient: user,
      status: r.status,
      message: r.message,
      createdAt: r.createdAt || new Date().toISOString(),
    }));
    setRequests(normalized);
  };

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setRequests([]);
      return;
    }
    void Promise.all([loadProjects(), loadRequests()]);
  }, [user]);

  const createProject = async (data: CreateProjectData): Promise<Project> => {
    const response = await apiRequest<{ project: any }>("/projects", {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        panels: [{ name: "To Do" }, { name: "In Progress" }, { name: "Done" }],
      }),
    });
    await loadProjects();
    return {
      id: response.project._id.toString(),
      name: response.project.name,
      description: response.project.description || "",
      status: response.project.status || "active",
      owner: user!,
      members: [{ user: user!, role: "owner", joinedAt: new Date().toISOString() }],
      panels: [],
      createdAt: response.project.createdAt || new Date().toISOString(),
      updatedAt: response.project.updatedAt || new Date().toISOString(),
    };
  };

  const updateProject = async (id: string, data: Partial<Project>) => {
    await apiRequest(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        status: data.status,
      }),
    });
    await loadProjects();
  };

  const deleteProject = async (id: string) => {
    await apiRequest(`/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const addPanel = async (projectId: string, name: string): Promise<Panel> => {
    const response = await apiRequest<{ panel: any }>("/panels", {
      method: "POST",
      body: JSON.stringify({ name, projectId }),
    });
    await loadProjects();
    return {
      id: response.panel._id.toString(),
      name: response.panel.name,
      order: response.panel.order || 0,
      projectId,
      tasks: [],
    };
  };

  const updatePanel = async (_projectId: string, panelId: string, name: string) => {
    await apiRequest(`/panels/${panelId}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
    await loadProjects();
  };

  const deletePanel = async (projectId: string, panelId: string) => {
    await apiRequest(`/panels/${panelId}`, { method: "DELETE" });
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, panels: p.panels.filter((panel) => panel.id !== panelId) } : p
      )
    );
  };

  const createTask = async (data: CreateTaskData): Promise<Task> => {
    const response = await apiRequest<{ task: any }>("/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        panelId: data.panelId,
        assignedDeveloper: data.assigneeId,
        priority: data.priority,
        deadline: data.dueDate,
      }),
    });
    await loadProjects();
    return {
      id: response.task._id.toString(),
      title: response.task.title,
      description: response.task.description || "",
      status: mapTaskStatus(response.task.status),
      priority: response.task.priority,
      reporter: user!,
      panelId: response.task.panelId?.toString() || data.panelId,
      projectId: response.task.projectId?.toString() || data.projectId,
      dueDate: response.task.deadline ? new Date(response.task.deadline).toISOString() : undefined,
      attachments: [],
      comments: [],
      subtasks: [],
      order: 0,
      createdAt: response.task.createdAt || new Date().toISOString(),
      updatedAt: response.task.updatedAt || new Date().toISOString(),
    };
  };

  const updateTask = async (taskId: string, data: Partial<Task>) => {
    const payload: any = {};
    if (data.status) payload.status = toApiTaskStatus(data.status);
    if (data.priority) payload.priority = data.priority;
    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.panelId) payload.panelId = data.panelId;
    if (Object.keys(payload).length === 1 && payload.status) {
      await apiRequest(`/tasks/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: payload.status }),
      });
    } else {
      await apiRequest(`/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    }
    await loadProjects();
  };

  const deleteTask = async (taskId: string) => {
    await apiRequest(`/tasks/${taskId}`, { method: "DELETE" });
    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        panels: p.panels.map((panel) => ({
          ...panel,
          tasks: panel.tasks.filter((task) => task.id !== taskId),
        })),
      }))
    );
  };

  const moveTask = async (taskId: string, newPanelId: string) => {
    await updateTask(taskId, { panelId: newPanelId });
  };

  const addComment = async (taskId: string, content: string) => {
    if (!user) return;

    const newComment = {
      id: `comment-${Date.now()}`,
      content,
      author: user,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        panels: p.panels.map((panel) => ({
          ...panel,
          tasks: panel.tasks.map((task) =>
            task.id === taskId
              ? { ...task, comments: [...task.comments, newComment] }
              : task
          ),
        })),
      }))
    );
  };

  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        panels: p.panels.map((panel) => ({
          ...panel,
          tasks: panel.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subtasks: task.subtasks.map((st) =>
                    st.id === subtaskId ? { ...st, completed: !st.completed } : st
                  ),
                }
              : task
          ),
        })),
      }))
    );
  };

  const addSubtask = async (taskId: string, title: string) => {
    const newSubtask = {
      id: `subtask-${Date.now()}`,
      title,
      completed: false,
    };

    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        panels: p.panels.map((panel) => ({
          ...panel,
          tasks: panel.tasks.map((task) =>
            task.id === taskId
              ? { ...task, subtasks: [...task.subtasks, newSubtask] }
              : task
          ),
        })),
      }))
    );
  };

  const sendInvitation = async (projectId: string, email: string, message?: string) => {
    if (!user) return;
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const usersResponse = await apiRequest<{ users: Array<any> }>("/auth/users");
    const developer = (usersResponse.users || []).find((u) => u.email === email);
    if (!developer) throw new Error("Developer not found");
    await apiRequest(`/projects/${projectId}/invite`, {
      method: "POST",
      body: JSON.stringify({ developerId: developer._id, message }),
    });
    await loadRequests();
  };

  const respondToRequest = async (requestId: string, accept: boolean) => {
    await apiRequest(`/requests/${requestId}/${accept ? "accept" : "reject"}`, {
      method: "PUT",
    });
    await Promise.all([loadProjects(), loadRequests()]);
  };

  const getProjectById = (id: string) => projects.find((p) => p.id === id);

  const getTaskById = (id: string): Task | undefined => {
    for (const project of projects) {
      for (const panel of project.panels) {
        const task = panel.tasks.find((t) => t.id === id);
        if (task) return task;
      }
    }
    return undefined;
  };

  const getMyTasks = (): Task[] => {
    if (!user) return [];
    const tasks: Task[] = [];
    for (const project of projects) {
      for (const panel of project.panels) {
        for (const task of panel.tasks) {
          if (task.assignee?.id === user.id || task.reporter.id === user.id) {
            tasks.push(task);
          }
        }
      }
    }
    return tasks;
  };

  return (
    <DataContext.Provider
      value={{
        projects,
        requests,
        createProject,
        updateProject,
        deleteProject,
        addPanel,
        updatePanel,
        deletePanel,
        createTask,
        updateTask,
        deleteTask,
        moveTask,
        addComment,
        toggleSubtask,
        addSubtask,
        sendInvitation,
        respondToRequest,
        getProjectById,
        getTaskById,
        getMyTasks,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
