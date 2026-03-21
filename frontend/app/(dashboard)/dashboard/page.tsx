"use client";

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

export default function DashboardPage() {
  const { user } = useAuth();
  const { projects, getMyTasks } = useData();

  const myTasks = getMyTasks();
  const completedTasks = myTasks.filter((t) => t.status === "done").length;
  const pendingTasks = myTasks.filter((t) => t.status !== "done").length;
  const overdueTasks = myTasks.filter(
    (t) => t.dueDate && isPast(parseISO(t.dueDate)) && t.status !== "done"
  ).length;

  const activeProjects = projects.filter((p) => p.status === "active").length;

  const stats = [
    {
      title: "Total Projects",
      value: projects.length,
      icon: FolderKanban,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
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
      title: "Completed",
      value: completedTasks,
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

  const recentTasks = myTasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      default:
        return "bg-blue-500";
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
        <Link href="/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
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
            <Link href="/projects/new">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.slice(0, 4).map((project) => {
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
            {projects.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <FolderKanban className="mx-auto mb-2 h-8 w-8" />
                <p>No projects yet. Create your first project!</p>
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
            {recentTasks.map((task) => (
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
                <Badge variant="outline" className="capitalize">
                  {task.priority}
                </Badge>
              </div>
            ))}
            {recentTasks.length === 0 && (
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
