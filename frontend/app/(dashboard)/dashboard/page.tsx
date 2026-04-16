"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
  FolderKanban,
  ListTodo,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  ArrowRight,
} from "lucide-react";
import { format, isPast, parseISO } from "date-fns";

type DashboardFilter = "all" | "active-projects" | "my-tasks" | "completed" | "pending" | "overdue";

export default function DashboardPage() {
  const { user } = useAuth();
  const { projects, getMyTasks } = useData();
  const [selectedFilter, setSelectedFilter] = useState<DashboardFilter>("all");

  const myTasks = getMyTasks();
  const isTaskInFinalPanel = (task: (typeof myTasks)[number]) => {
    const project = projects.find((currentProject) => currentProject.id === task.projectId);
    if (!project) return false;
    const finalPanel = [...project.panels].sort((a, b) => a.order - b.order).at(-1);
    return finalPanel ? finalPanel.id === task.panelId : false;
  };

  const isCompletedInFinalPanel = (task: (typeof myTasks)[number]) =>
    task.status === "done" && isTaskInFinalPanel(task);

  const getTaskProgressPercent = (task: (typeof myTasks)[number]) => {
    const project = projects.find((currentProject) => currentProject.id === task.projectId);
    if (!project) return 0;

    const orderedPanels = [...project.panels].sort((a, b) => a.order - b.order);
    const panelIndex = orderedPanels.findIndex((panel) => panel.id === task.panelId);
    if (panelIndex < 0) return 0;

    if (orderedPanels.length <= 1) return 0;
    return Math.round((panelIndex / (orderedPanels.length - 1)) * 100);
  };

  const completedTasks = myTasks.filter((t) => isCompletedInFinalPanel(t)).length;
  const pendingTasks = myTasks.filter((t) => !isCompletedInFinalPanel(t)).length;
  const overdueTasks = myTasks.filter(
    (t) => t.dueDate && isPast(parseISO(t.dueDate)) && !isCompletedInFinalPanel(t)
  ).length;

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;

  const filteredProjects = useMemo(() => {
    if (selectedFilter === "active-projects") {
      return projects.filter((project) => project.status === "active");
    }
    return projects;
  }, [projects, selectedFilter]);

  const filteredTasks = useMemo(() => {
    switch (selectedFilter) {
      case "completed":
        return myTasks.filter((task) => isCompletedInFinalPanel(task));
      case "pending":
        return myTasks.filter((task) => !isCompletedInFinalPanel(task));
      case "overdue":
        return myTasks.filter(
          (task) => task.dueDate && isPast(parseISO(task.dueDate)) && !isCompletedInFinalPanel(task)
        );
      case "my-tasks":
      case "all":
      case "active-projects":
      default:
        return myTasks;
    }
  }, [myTasks, selectedFilter]);

  const filterLabel = useMemo(() => {
    switch (selectedFilter) {
      case "active-projects":
        return "Active projects";
      case "my-tasks":
        return "My tasks";
      case "completed":
        return "Completed tasks";
      case "pending":
        return "Pending tasks";
      case "overdue":
        return "Overdue tasks";
      default:
        return null;
    }
  }, [selectedFilter]);

  const stats = [
    {
      title: "Total Projects",
      value: projects.length,
      icon: FolderKanban,
      color: "text-amber-800",
      bgColor: "bg-amber-800/10",
    },
    {
      title: "Active Projects",
      value: activeProjects,
      icon: FolderKanban,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "My Tasks",
      value: myTasks.length,
      icon: ListTodo,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Completed Projects",
      value: completedProjects,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Pending",
      value: pendingTasks,
      icon: Clock,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Overdue",
      value: overdueTasks,
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      default:
        return "bg-amber-700";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.firstName}!</h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your projects today.
          </p>
        </div>
        {user?.role === "admin" && (
          <Link href="/projects/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Link>
        )}
      </div>

      <div className="dashboard-stats-grid grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            role="button"
            tabIndex={0}
            aria-pressed={
              (stat.title === "Active Projects" && selectedFilter === "active-projects") ||
              (stat.title === "My Tasks" && selectedFilter === "my-tasks") ||
              (stat.title === "Completed Projects" && selectedFilter === "completed") ||
              (stat.title === "Pending" && selectedFilter === "pending") ||
              (stat.title === "Overdue" && selectedFilter === "overdue") ||
              (stat.title === "Total Projects" && selectedFilter === "all")
            }
            onClick={() => {
              if (stat.title === "Total Projects") setSelectedFilter("all");
              if (stat.title === "Active Projects") setSelectedFilter("active-projects");
              if (stat.title === "My Tasks") setSelectedFilter("my-tasks");
              if (stat.title === "Completed Projects") setSelectedFilter("completed");
              if (stat.title === "Pending") setSelectedFilter("pending");
              if (stat.title === "Overdue") setSelectedFilter("overdue");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                (event.currentTarget as HTMLDivElement).click();
              }
            }}
            className={`cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${
              (stat.title === "Active Projects" && selectedFilter === "active-projects") ||
              (stat.title === "My Tasks" && selectedFilter === "my-tasks") ||
              (stat.title === "Completed Projects" && selectedFilter === "completed") ||
              (stat.title === "Pending" && selectedFilter === "pending") ||
              (stat.title === "Overdue" && selectedFilter === "overdue") ||
              (stat.title === "Total Projects" && selectedFilter === "all")
                ? "ring-2 ring-primary/40"
                : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Your active projects and progress</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {filterLabel && <Badge variant="outline">{filterLabel}</Badge>}
              {selectedFilter !== "all" && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedFilter("all")}>
                  Clear
                </Button>
              )}
            </div>
            <Link href="/admin/projects">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredProjects.slice(0, 4).map((project) => {
              const totalTasks = project.panels.reduce(
                (sum, panel) => sum + panel.tasks.length,
                0
              );
              const doneTasks = project.panels
                .find((p) => p.name.toLowerCase().includes("done"))
                ?.tasks.length || 0;
              const progress = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{project.name}</h3>
                        <Badge
                          variant={
                            project.status === "active" ? "default" : "secondary"
                          }
                        >
                          {project.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {totalTasks} tasks, {doneTasks} completed
                      </p>
                      <Progress value={progress} className="mt-2 h-2" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
            {filteredProjects.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <FolderKanban className="mx-auto mb-2 h-8 w-8" />
                <p>No projects match the current filter.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Tasks</CardTitle>
              <CardDescription>Tasks assigned to you</CardDescription>
            </div>
            <Link href="/tasks">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredTasks
              .filter((task) => selectedFilter === "completed" || !isCompletedInFinalPanel(task))
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 5)
              .map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div
                    className={`h-2 w-2 rounded-full ${getPriorityColor(task.priority)}`}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="capitalize">{task.status.replace("_", " ")}</span>
                      {task.dueDate && (
                        <>
                          <span>•</span>
                          <span
                            className={
                              isPast(parseISO(task.dueDate)) ? "text-red-500" : ""
                            }
                          >
                            Due {format(parseISO(task.dueDate), "MMM d")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {getTaskProgressPercent(task)}%
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            {filteredTasks.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8" />
                <p>No pending tasks. You&apos;re all caught up!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
