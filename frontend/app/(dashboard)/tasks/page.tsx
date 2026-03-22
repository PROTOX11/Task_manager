"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, CheckCircle2 } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import type { Task } from "@/lib/types";

export default function TasksPage() {
  const { getMyTasks, updateTask, projects } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const myTasks = getMyTasks();

  const filteredTasks = myTasks.filter((task) => {
    const matchesSearch = task.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || task.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

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

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    await updateTask(task.id, { status: newStatus });
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Task List</CardTitle>
              <CardDescription>
                {filteredTasks.length} task{filteredTasks.length !== 1 && "s"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  className="pl-8 w-[200px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                  task.status === "done" ? "opacity-60" : ""
                }`}
              >
                <Checkbox
                  checked={task.status === "done"}
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
              </div>
            ))}
            {filteredTasks.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto mb-3 h-12 w-12" />
                <p className="text-lg font-medium">No tasks found</p>
                <p className="mt-1">
                  {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                    ? "Try adjusting your filters"
                    : "You don't have any tasks assigned yet"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
