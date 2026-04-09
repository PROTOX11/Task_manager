"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogTitleComponent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Trash2,
  Send,
  Paperclip,
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
  const { updateTask, deleteTask, addComment } = useData();
  const [newComment, setNewComment] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedDueDate, setEditedDueDate] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const projectMembers = useMemo(() => {
    const seen = new Set<string>();
    return project.members.filter((member) => {
      if (seen.has(member.user.id)) return false;
      seen.add(member.user.id);
      return true;
    });
  }, [project.members]);

  const mentionableMembers = useMemo(() => {
    const query = mentionQuery.trim().toLowerCase();
    return projectMembers.filter((member) => {
      const fullName = `${member.user.firstName} ${member.user.lastName}`.toLowerCase();
      const email = member.user.email.toLowerCase();
      const role = member.user.role.toLowerCase();
      return (
        !query ||
        fullName.includes(query) ||
        email.includes(query) ||
        role.includes(query)
      );
    });
  }, [mentionQuery, projectMembers]);

  if (!task) return null;
  const canEditTask =
    user?.role === "admin" ||
    task.reporter.id === user?.id ||
    task.assignee?.id === user?.id;
  const canComment = Boolean(user);

  const formatDateForInput = (value?: string) => {
    if (!value) return "";
    return new Date(value).toISOString().slice(0, 10);
  };

  const handleSave = async () => {
    if (!canEditTask) {
      toast.error("You cannot modify this task.");
      return;
    }
    await updateTask(task.id, {
      title: editedTitle,
      description: editedDescription,
      dueDate: editedDueDate ? new Date(`${editedDueDate}T12:00:00`).toISOString() : undefined,
    });
    setIsEditing(false);
    toast.success("Task updated");
  };

  const handleDelete = async () => {
    if (!canEditTask) {
      toast.error("You cannot modify this task.");
      return;
    }
    await deleteTask(task.id);
    onClose();
    toast.success("Task deleted");
  };

  const handleAddComment = async () => {
    if (!canComment) {
      return;
    }
    if (!newComment.trim()) return;
    await addComment(task.id, newComment);
    setNewComment("");
    setMentionQuery("");
    setMentionOpen(false);
    toast.success("Comment added");
  };

  const handleCommentChange = (value: string) => {
    setNewComment(value);
    const match = value.match(/(?:^|\s)@([a-zA-Z0-9._-]*)$/);
    if (match) {
      setMentionQuery(match[1] || "");
      setMentionOpen(true);
    } else {
      setMentionQuery("");
      setMentionOpen(false);
    }
  };

  const handleMentionSelect = (member: (typeof project.members)[number]) => {
    const mentionHandle = member.user.email.split("@")[0] || member.user.firstName || "user";
    setNewComment((current) => current.replace(/(?:^|\s)@([a-zA-Z0-9._-]*)$/, ` @${mentionHandle} `));
    setMentionQuery("");
    setMentionOpen(false);
  };

  const handleStatusChange = async (status: Task["status"]) => {
    await updateTask(task.id, { status });
    toast.success("Status updated");
  };

  const handlePriorityChange = async (priority: Task["priority"]) => {
    if (!canEditTask) {
      toast.error("You cannot modify this task.");
      return;
    }
    await updateTask(task.id, { priority });
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
            {canEditTask ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitleComponent>Delete task?</AlertDialogTitleComponent>
                    <AlertDialogDescription>
                      Are you sure you want to delete this task? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <div className="h-10 w-10" />
            )}
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-lg font-semibold"
                  disabled={!canEditTask}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <DialogTitle
                    className={`text-xl ${canEditTask ? "cursor-pointer hover:text-primary" : ""}`}
                    onClick={() => {
                      if (!canEditTask) return;
                      setEditedTitle(task.title);
                      setEditedDescription(task.description);
                      setIsEditing(true);
                    }}
                  >
                    {task.title}
                  </DialogTitle>
                  {!canEditTask && (
                    <Badge variant="secondary" className="shrink-0">
                      Read only
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Status</p>
                <Select value={task.status} onValueChange={handleStatusChange} disabled={!canEditTask}>
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
                <Select value={task.priority} onValueChange={handlePriorityChange} disabled={!canEditTask}>
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

              <div>
                <p className="mb-1 text-sm text-muted-foreground">Due Date</p>
                {isEditing && canEditTask ? (
                  <Input
                    type="date"
                    value={editedDueDate}
                    onChange={(e) => setEditedDueDate(e.target.value)}
                    className="w-[160px]"
                    disabled={!canEditTask}
                  />
                ) : task.dueDate ? (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(parseISO(task.dueDate), "MMM d, yyyy")}
                  </Badge>
                ) : (
                  <p className="text-sm text-muted-foreground">No due date set</p>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Description</p>
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={3}
                    disabled={!canEditTask}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} disabled={!canEditTask}>
                      Save
                    </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={!canEditTask}
                  >
                    Cancel
                  </Button>
                </div>
                </div>
              ) : (
                <p
                  className={`rounded-md bg-muted/50 p-3 text-sm ${
                    canEditTask ? "cursor-pointer hover:bg-muted" : "cursor-default"
                  }`}
                  onClick={() => {
                    if (!canEditTask) return;
                    setEditedTitle(task.title);
                    setEditedDescription(task.description);
                    setEditedDueDate(formatDateForInput(task.dueDate));
                    setIsEditing(true);
                  }}
                >
                  {task.description || "Click to add description..."}
                </p>
              )}
            </div>

            <Separator />

            {task.attachments.length > 0 && (
              <>
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    <p className="text-sm font-medium">Attachments ({task.attachments.length})</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {task.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border p-3 text-sm transition hover:bg-muted/50"
                      >
                        <p className="font-medium">{attachment.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {(attachment.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

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
                  <div className="relative flex-1 space-y-2">
                    <Input
                      placeholder="Write a comment... use @ to mention someone"
                      value={newComment}
                      onChange={(e) => handleCommentChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddComment();
                      }}
                      disabled={!canComment}
                    />
                    {mentionOpen && mentionableMembers.length > 0 && (
                      <div className="absolute bottom-full left-0 mb-2 w-full rounded-xl border bg-background p-2 shadow-lg">
                        <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                          Mention someone
                        </p>
                        <div className="max-h-48 space-y-1 overflow-auto">
                          {mentionableMembers.map((member) => (
                            <button
                              key={member.user.id}
                              type="button"
                              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-muted/60"
                              onClick={() => handleMentionSelect(member)}
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {member.user.firstName} {member.user.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">{member.user.email}</p>
                              </div>
                              <Badge variant="outline" className="text-[10px] uppercase">
                                {member.user.role}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Type <span className="font-medium">@</span> to tag admins or developers and send them a notification.
                    </p>
                  </div>
                  <Button size="icon" onClick={handleAddComment} disabled={!canComment}>
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
