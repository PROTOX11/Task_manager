"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  GripVertical,
  MessageSquare,
  Paperclip,
  CheckSquare,
  Calendar,
} from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { toast } from "sonner";
import type { Project, Task, Panel } from "@/lib/types";

interface KanbanBoardProps {
  project: Project;
  onTaskClick: (task: Task) => void;
  onAddTask: (panelId: string) => void;
}

export function KanbanBoard({ project, onTaskClick, onAddTask }: KanbanBoardProps) {
  const { addPanel, updatePanel, deletePanel, moveTask } = useData();
  const [addingPanel, setAddingPanel] = useState(false);
  const [newPanelName, setNewPanelName] = useState("");
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);
  const [editingPanelName, setEditingPanelName] = useState("");
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const handleAddPanel = async () => {
    if (!newPanelName.trim()) return;
    await addPanel(project.id, newPanelName);
    setNewPanelName("");
    setAddingPanel(false);
    toast.success("Panel added");
  };

  const handleUpdatePanel = async (panelId: string) => {
    if (!editingPanelName.trim()) return;
    await updatePanel(project.id, panelId, editingPanelName);
    setEditingPanelId(null);
    setEditingPanelName("");
    toast.success("Panel updated");
  };

  const handleDeletePanel = async (panelId: string) => {
    await deletePanel(project.id, panelId);
    toast.success("Panel deleted");
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (panelId: string) => {
    if (draggedTask && draggedTask.panelId !== panelId) {
      await moveTask(draggedTask.id, panelId);
      toast.success("Task moved");
    }
    setDraggedTask(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-l-red-500";
      case "high":
        return "border-l-orange-500";
      case "medium":
        return "border-l-yellow-500";
      default:
        return "border-l-blue-500";
    }
  };

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4">
        {project.panels
          .sort((a, b) => a.order - b.order)
          .map((panel) => (
            <PanelColumn
              key={panel.id}
              panel={panel}
              onTaskClick={onTaskClick}
              onAddTask={onAddTask}
              onEdit={() => {
                setEditingPanelId(panel.id);
                setEditingPanelName(panel.name);
              }}
              onDelete={() => handleDeletePanel(panel.id)}
              editingPanelId={editingPanelId}
              editingPanelName={editingPanelName}
              setEditingPanelName={setEditingPanelName}
              onSaveEdit={() => handleUpdatePanel(panel.id)}
              onCancelEdit={() => setEditingPanelId(null)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(panel.id)}
              getPriorityColor={getPriorityColor}
            />
          ))}

        {addingPanel ? (
          <Card className="w-72 shrink-0">
            <CardContent className="p-3">
              <Input
                placeholder="Panel name"
                value={newPanelName}
                onChange={(e) => setNewPanelName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddPanel();
                  if (e.key === "Escape") setAddingPanel(false);
                }}
                autoFocus
              />
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={handleAddPanel}>
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddingPanel(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            variant="outline"
            className="h-auto w-72 shrink-0 justify-start py-3"
            onClick={() => setAddingPanel(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Panel
          </Button>
        )}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

interface PanelColumnProps {
  panel: Panel;
  onTaskClick: (task: Task) => void;
  onAddTask: (panelId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  editingPanelId: string | null;
  editingPanelName: string;
  setEditingPanelName: (name: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDragStart: (task: Task) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  getPriorityColor: (priority: string) => string;
}

function PanelColumn({
  panel,
  onTaskClick,
  onAddTask,
  onEdit,
  onDelete,
  editingPanelId,
  editingPanelName,
  setEditingPanelName,
  onSaveEdit,
  onCancelEdit,
  onDragStart,
  onDragOver,
  onDrop,
  getPriorityColor,
}: PanelColumnProps) {
  return (
    <Card
      className="w-72 shrink-0 bg-muted/30"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          {editingPanelId === panel.id ? (
            <Input
              value={editingPanelName}
              onChange={(e) => setEditingPanelName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              autoFocus
              className="h-7"
            />
          ) : (
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              {panel.name}
              <Badge variant="secondary" className="text-xs">
                {panel.tasks.length}
              </Badge>
            </CardTitle>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>Rename</DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-2">
        {panel.tasks
          .sort((a, b) => a.order - b.order)
          .map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onDragStart={() => onDragStart(task)}
              getPriorityColor={getPriorityColor}
            />
          ))}
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={() => onAddTask(panel.id)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </CardContent>
    </Card>
  );
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onDragStart: () => void;
  getPriorityColor: (priority: string) => string;
}

function TaskCard({ task, onClick, onDragStart, getPriorityColor }: TaskCardProps) {
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const isOverdue = task.dueDate && isPast(parseISO(task.dueDate)) && task.status !== "done";

  return (
    <Card
      className={`cursor-pointer border-l-4 transition-shadow hover:shadow-md ${getPriorityColor(task.priority)}`}
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 space-y-2">
            <p className="font-medium leading-tight">{task.title}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {task.dueDate && (
                <span
                  className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : ""}`}
                >
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(task.dueDate), "MMM d")}
                </span>
              )}
              {task.comments.length > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {task.comments.length}
                </span>
              )}
              {task.attachments.length > 0 && (
                <span className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  {task.attachments.length}
                </span>
              )}
              {task.subtasks.length > 0 && (
                <span className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" />
                  {completedSubtasks}/{task.subtasks.length}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs capitalize">
                {task.priority}
              </Badge>
              {task.assignee && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {task.assignee.firstName.charAt(0)}
                  {task.assignee.lastName.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
