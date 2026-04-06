"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import type { Task } from "@/lib/types";

export default function TasksPage() {
  const { getMyTasks, updateTask, projects } = useData();
  const { user } = useAuth();
  const router = useRouter();

  const myTasks = getMyTasks();
  const latestTasks = [...myTasks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const getProjectName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || "Unknown Project";
  };

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

  const getStatusBadge = (status: Task["status"]) => {
    switch (status) {
      case "done":
        return <Badge className="bg-green-500">Done</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case "review":
        return <Badge className="bg-purple-500">Review</Badge>;
      default:
        return <Badge variant="secondary">To Do</Badge>;
    }
  };

  const canModifyTask = (task: Task) => {
    return Boolean(user && task);
  };

  const toggleTaskStatus = async (task: Task) => {
    if (!canModifyTask(task)) {
      return;
    }
    const newStatus = task.status === "done" ? "todo" : "done";
    await updateTask(task.id, { status: newStatus });
  };

  const openTask = (task: Task) => {
    router.push(`/projects/${task.projectId}?task=${task.id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Tasks</h1>
        <p className="text-muted-foreground">
          All tasks assigned to you across all projects
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Latest Tasks</CardTitle>
              <CardDescription>
                Newest tasks appear first so you can focus on what changed most recently.
              </CardDescription>
            </div>
            <p className="text-sm text-muted-foreground">
              {latestTasks.length} task{latestTasks.length !== 1 && "s"}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {latestTasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                  task.status === "done" ? "opacity-60" : ""
                }`}
              >
                <Checkbox
                  checked={task.status === "done"}
                  disabled={!canModifyTask(task)}
                  onCheckedChange={() => toggleTaskStatus(task)}
                />
                <div
                  className={`h-3 w-3 rounded-full ${getPriorityColor(task.priority)}`}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-medium ${
                        task.status === "done" ? "line-through" : ""
                      }`}
                    >
                      {task.title}
                    </p>
                    {getStatusBadge(task.status)}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{getProjectName(task.projectId)}</span>
                    {task.dueDate && (
                      <>
                        <span>•</span>
                        <span
                          className={
                            isPast(parseISO(task.dueDate)) && task.status !== "done"
                              ? "text-red-500"
                              : ""
                          }
                        >
                          Due {format(parseISO(task.dueDate), "MMM d, yyyy")}
                        </span>
                      </>
                    )}
                    {task.subtasks.length > 0 && (
                      <>
                        <span>•</span>
                        <span>
                          {task.subtasks.filter((s) => s.completed).length}/
                          {task.subtasks.length} subtasks
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">
                  {task.priority}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => openTask(task)}>
                  Open
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ))}
            {latestTasks.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto mb-3 h-12 w-12" />
                <p className="text-lg font-medium">No tasks found</p>
                <p className="mt-1">You don&apos;t have any tasks assigned yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
