"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { Project, Panel, Task, ProjectRequest, User } from "./types";
import { useAuth } from "./auth-context";

interface DataContextType {
  projects: Project[];
  requests: ProjectRequest[];
  createProject: (data: CreateProjectData) => Project;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addPanel: (projectId: string, name: string) => Panel;
  updatePanel: (projectId: string, panelId: string, name: string) => void;
  deletePanel: (projectId: string, panelId: string) => void;
  createTask: (data: CreateTaskData) => Task;
  updateTask: (taskId: string, data: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  moveTask: (taskId: string, newPanelId: string) => void;
  addComment: (taskId: string, content: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  sendInvitation: (projectId: string, email: string, message?: string) => void;
  respondToRequest: (requestId: string, accept: boolean) => void;
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

// Initial demo data
const createInitialData = (currentUser: User | null): { projects: Project[]; requests: ProjectRequest[] } => {
  if (!currentUser) return { projects: [], requests: [] };

  const demoUser2: User = {
    id: "2",
    email: "user@demo.com",
    firstName: "John",
    lastName: "Doe",
    role: "user",
    createdAt: new Date().toISOString(),
  };

  const projects: Project[] = [
    {
      id: "proj-1",
      name: "Website Redesign",
      description: "Complete redesign of the company website with modern UI/UX",
      status: "active",
      owner: currentUser,
      members: [
        { user: currentUser, role: "owner", joinedAt: new Date().toISOString() },
      ],
      panels: [
        {
          id: "panel-1",
          name: "To Do",
          order: 0,
          projectId: "proj-1",
          tasks: [
            {
              id: "task-1",
              title: "Design homepage mockup",
              description: "Create initial mockup for the homepage redesign",
              status: "todo",
              priority: "high",
              reporter: currentUser,
              panelId: "panel-1",
              projectId: "proj-1",
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              attachments: [],
              comments: [],
              subtasks: [
                { id: "st-1", title: "Research competitors", completed: true },
                { id: "st-2", title: "Create wireframes", completed: false },
              ],
              order: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        },
        {
          id: "panel-2",
          name: "In Progress",
          order: 1,
          projectId: "proj-1",
          tasks: [
            {
              id: "task-2",
              title: "Set up project structure",
              description: "Initialize the project with Next.js and configure Tailwind CSS",
              status: "in_progress",
              priority: "medium",
              assignee: currentUser,
              reporter: currentUser,
              panelId: "panel-2",
              projectId: "proj-1",
              attachments: [],
              comments: [
                {
                  id: "comment-1",
                  content: "Started working on this today",
                  author: currentUser,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
              subtasks: [],
              order: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        },
        {
          id: "panel-3",
          name: "Review",
          order: 2,
          projectId: "proj-1",
          tasks: [],
        },
        {
          id: "panel-4",
          name: "Done",
          order: 3,
          projectId: "proj-1",
          tasks: [
            {
              id: "task-3",
              title: "Project kickoff meeting",
              description: "Initial meeting to discuss project goals and timeline",
              status: "done",
              priority: "low",
              reporter: currentUser,
              panelId: "panel-4",
              projectId: "proj-1",
              attachments: [],
              comments: [],
              subtasks: [],
              order: 0,
              createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "proj-2",
      name: "Mobile App Development",
      description: "Build a cross-platform mobile application",
      status: "active",
      owner: currentUser,
      members: [
        { user: currentUser, role: "owner", joinedAt: new Date().toISOString() },
      ],
      panels: [
        {
          id: "panel-5",
          name: "Backlog",
          order: 0,
          projectId: "proj-2",
          tasks: [
            {
              id: "task-4",
              title: "User authentication flow",
              description: "Implement login, signup, and password reset",
              status: "todo",
              priority: "urgent",
              reporter: currentUser,
              panelId: "panel-5",
              projectId: "proj-2",
              dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
              attachments: [],
              comments: [],
              subtasks: [],
              order: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        },
        {
          id: "panel-6",
          name: "In Development",
          order: 1,
          projectId: "proj-2",
          tasks: [],
        },
        {
          id: "panel-7",
          name: "Completed",
          order: 2,
          projectId: "proj-2",
          tasks: [],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const requests: ProjectRequest[] = [
    {
      id: "req-1",
      project: projects[0],
      sender: demoUser2,
      recipient: currentUser,
      status: "pending",
      message: "I would like to join your website redesign project!",
      createdAt: new Date().toISOString(),
    },
  ];

  return { projects, requests };
};

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize data when user changes
  if (user && !initialized) {
    const initial = createInitialData(user);
    setProjects(initial.projects);
    setRequests(initial.requests);
    setInitialized(true);
  }

  if (!user && initialized) {
    setProjects([]);
    setRequests([]);
    setInitialized(false);
  }

  const createProject = (data: CreateProjectData): Project => {
    if (!user) throw new Error("Not authenticated");

    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: data.name,
      description: data.description,
      status: "active",
      owner: user,
      members: [{ user, role: "owner", joinedAt: new Date().toISOString() }],
      panels: [
        { id: `panel-${Date.now()}-1`, name: "To Do", order: 0, projectId: "", tasks: [] },
        { id: `panel-${Date.now()}-2`, name: "In Progress", order: 1, projectId: "", tasks: [] },
        { id: `panel-${Date.now()}-3`, name: "Done", order: 2, projectId: "", tasks: [] },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    newProject.panels = newProject.panels.map((p) => ({ ...p, projectId: newProject.id }));

    setProjects((prev) => [...prev, newProject]);
    return newProject;
  };

  const updateProject = (id: string, data: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
      )
    );
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const addPanel = (projectId: string, name: string): Panel => {
    const newPanel: Panel = {
      id: `panel-${Date.now()}`,
      name,
      order: 0,
      projectId,
      tasks: [],
    };

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const maxOrder = Math.max(...p.panels.map((panel) => panel.order), -1);
          return {
            ...p,
            panels: [...p.panels, { ...newPanel, order: maxOrder + 1 }],
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );

    return newPanel;
  };

  const updatePanel = (projectId: string, panelId: string, name: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            panels: p.panels.map((panel) =>
              panel.id === panelId ? { ...panel, name } : panel
            ),
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );
  };

  const deletePanel = (projectId: string, panelId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            panels: p.panels.filter((panel) => panel.id !== panelId),
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );
  };

  const createTask = (data: CreateTaskData): Task => {
    if (!user) throw new Error("Not authenticated");

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: data.title,
      description: data.description,
      status: "todo",
      priority: data.priority,
      reporter: user,
      panelId: data.panelId,
      projectId: data.projectId,
      dueDate: data.dueDate,
      attachments: [],
      comments: [],
      subtasks: [],
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === data.projectId) {
          return {
            ...p,
            panels: p.panels.map((panel) => {
              if (panel.id === data.panelId) {
                const maxOrder = Math.max(...panel.tasks.map((t) => t.order), -1);
                return {
                  ...panel,
                  tasks: [...panel.tasks, { ...newTask, order: maxOrder + 1 }],
                };
              }
              return panel;
            }),
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );

    return newTask;
  };

  const updateTask = (taskId: string, data: Partial<Task>) => {
    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        panels: p.panels.map((panel) => ({
          ...panel,
          tasks: panel.tasks.map((task) =>
            task.id === taskId
              ? { ...task, ...data, updatedAt: new Date().toISOString() }
              : task
          ),
        })),
      }))
    );
  };

  const deleteTask = (taskId: string) => {
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

  const moveTask = (taskId: string, newPanelId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        let taskToMove: Task | undefined;

        // Find and remove the task from its current panel
        const updatedPanels = p.panels.map((panel) => {
          const taskIndex = panel.tasks.findIndex((t) => t.id === taskId);
          if (taskIndex !== -1) {
            taskToMove = { ...panel.tasks[taskIndex], panelId: newPanelId };
            return {
              ...panel,
              tasks: panel.tasks.filter((t) => t.id !== taskId),
            };
          }
          return panel;
        });

        // Add the task to the new panel
        if (taskToMove) {
          return {
            ...p,
            panels: updatedPanels.map((panel) => {
              if (panel.id === newPanelId) {
                return {
                  ...panel,
                  tasks: [...panel.tasks, taskToMove!],
                };
              }
              return panel;
            }),
            updatedAt: new Date().toISOString(),
          };
        }

        return p;
      })
    );
  };

  const addComment = (taskId: string, content: string) => {
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

  const toggleSubtask = (taskId: string, subtaskId: string) => {
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

  const addSubtask = (taskId: string, title: string) => {
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

  const sendInvitation = (projectId: string, email: string, message?: string) => {
    if (!user) return;

    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const newRequest: ProjectRequest = {
      id: `req-${Date.now()}`,
      project,
      sender: user,
      recipient: { id: `user-${Date.now()}`, email, firstName: email.split("@")[0], lastName: "", role: "user", createdAt: new Date().toISOString() },
      status: "pending",
      message,
      createdAt: new Date().toISOString(),
    };

    setRequests((prev) => [...prev, newRequest]);
  };

  const respondToRequest = (requestId: string, accept: boolean) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: accept ? "accepted" : "rejected" }
          : r
      )
    );

    if (accept) {
      const request = requests.find((r) => r.id === requestId);
      if (request && user) {
        setProjects((prev) =>
          prev.map((p) => {
            if (p.id === request.project.id) {
              return {
                ...p,
                members: [
                  ...p.members,
                  { user: request.sender, role: "member", joinedAt: new Date().toISOString() },
                ],
              };
            }
            return p;
          })
        );
      }
    }
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
