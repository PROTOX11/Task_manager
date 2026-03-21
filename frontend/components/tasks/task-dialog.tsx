"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  MessageSquare,
  CheckSquare,
  Trash2,
  Send,
  Plus,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import type { Task, Project } from "@/lib/types";

interface TaskDialogProps {
  task: Task | null;
  project: Project;
  onClose: () => void;
}

export function TaskDialog({ task, project, onClose }: TaskDialogProps) {
  const { user } = useAuth();
  const { updateTask, deleteTask, addComment, toggleSubtask, addSubtask } = useData();
  const [newComment, setNewComment] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");

  if (!task) return null;

  const handleSave = () => {
    updateTask(task.id, {
      title: editedTitle,
      description: editedDescription,
    });
    setIsEditing(false);
    toast.success("Task updated");
  };

  const handleDelete = () => {
    deleteTask(task.id);
    onClose();
    toast.success("Task deleted");
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addComment(task.id, newComment);
    setNewComment("");
    toast.success("Comment added");
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    addSubtask(task.id, newSubtask);
    setNewSubtask("");
    toast.success("Subtask added");
  };

  const handleStatusChange = (status: Task["status"]) => {
    updateTask(task.id, { status });
    toast.success("Status updated");
  };

  const handlePriorityChange = (priority: Task["priority"]) => {
    updateTask(task.id, { priority });
    toast.success("Priority updated");
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
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

  return (
    <Dialog open={!!task} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-lg font-semibold"
                />
              ) : (
                <DialogTitle
                  className="cursor-pointer text-xl hover:text-primary"
                  onClick={() => {
                    setEditedTitle(task.title);
                    setEditedDescription(task.description);
                    setIsEditing(true);
                  }}
                >
                  {task.title}
                </DialogTitle>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Status</p>
                <Select value={task.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">Priority</p>
                <Select value={task.priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="w-[140px]">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${getPriorityColor(task.priority)}`} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {task.dueDate && (
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Due Date</p>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(parseISO(task.dueDate), "MMM d, yyyy")}
                  </Badge>
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Description</p>
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p
                  className="cursor-pointer rounded-md bg-muted/50 p-3 text-sm hover:bg-muted"
                  onClick={() => {
                    setEditedTitle(task.title);
                    setEditedDescription(task.description);
                    setIsEditing(true);
                  }}
                >
                  {task.description || "Click to add description..."}
                </p>
              )}
            </div>

            <Separator />

            <div>
              <div className="mb-3 flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                <p className="text-sm font-medium">
                  Subtasks ({task.subtasks.filter((s) => s.completed).length}/
                  {task.subtasks.length})
                </p>
              </div>
              <div className="space-y-2">
                {task.subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-2 rounded-md border p-2"
                  >
                    <Checkbox
                      checked={subtask.completed}
                      onCheckedChange={() => toggleSubtask(task.id, subtask.id)}
                    />
                    <span
                      className={
                        subtask.completed ? "line-through text-muted-foreground" : ""
                      }
                    >
                      {subtask.title}
                    </span>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a subtask..."
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddSubtask();
                    }}
                  />
                  <Button size="icon" variant="outline" onClick={handleAddSubtask}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <div className="mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <p className="text-sm font-medium">Comments ({task.comments.length})</p>
              </div>
              <div className="space-y-3">
                {task.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(comment.author.firstName, comment.author.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {comment.author.firstName} {comment.author.lastName}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(comment.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {user ? getInitials(user.firstName, user.lastName) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <Input
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddComment();
                    }}
                  />
                  <Button size="icon" onClick={handleAddComment}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
