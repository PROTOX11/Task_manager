"use client";

import { useEffect, useState } from "react";
import { useData } from "@/lib/data-context";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/lib/types";

type DeveloperOption = {
  id: string;
  name: string;
  email: string;
};

const UNASSIGNED_VALUE = "__unassigned__";

interface CreateTaskDialogProps {
  projectId: string;
  panelId: string | null;
  onClose: () => void;
}

export function CreateTaskDialog({
  projectId,
  panelId,
  onClose,
}: CreateTaskDialogProps) {
  const { createTask } = useData();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDevelopers, setIsLoadingDevelopers] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueDate, setDueDate] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [developers, setDevelopers] = useState<DeveloperOption[]>([]);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setDevelopers([]);
      return;
    }

    let isMounted = true;

    const loadDevelopers = async () => {
      try {
        setIsLoadingDevelopers(true);
        const response = await apiRequest<{ developers: Array<any> }>("/auth/developers");
        if (!isMounted) return;

        setDevelopers(
          (response.developers || []).map((developer) => ({
            id: (developer._id || developer.id).toString(),
            name: developer.name,
            email: developer.email,
          }))
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load developers";
        toast.error(message);
      } finally {
        if (isMounted) {
          setIsLoadingDevelopers(false);
        }
      }
    };

    void loadDevelopers();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!panelId) return;

    setIsLoading(true);

    try {
      await createTask({
        title,
        description,
        panelId,
        projectId,
        priority,
        dueDate: dueDate || undefined,
        assigneeId: assigneeId || undefined,
        attachments,
      });
      toast.success("Task created!");
      handleClose();
    } catch {
      toast.error("Failed to create task");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setAttachments([]);
    setAssigneeId("");
    onClose();
  };

  return (
    <Dialog open={!!panelId} onOpenChange={() => handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to your project board
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="title">Task Title</FieldLabel>
              <Input
                id="title"
                placeholder="Enter task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                placeholder="Describe the task..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="priority">Priority</FieldLabel>
                <Select value={priority} onValueChange={(v: Task["priority"]) => setPriority(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="dueDate">Due Date</FieldLabel>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="assignee">Assign Developer</FieldLabel>
              <Select
                value={assigneeId || UNASSIGNED_VALUE}
                onValueChange={(value) =>
                  setAssigneeId(value === UNASSIGNED_VALUE ? "" : value)
                }
                disabled={isLoadingDevelopers}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose the developer who will work on this task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                  {developers.map((developer) => (
                    <SelectItem key={developer.id} value={developer.id}>
                      {developer.name} ({developer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                The selected developer will receive a notification when this task is created.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="attachments">Attachments</FieldLabel>
              <Input
                id="attachments"
                type="file"
                multiple
                onChange={(e) => setAttachments(Array.from(e.target.files || []))}
              />
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p>You can attach multiple files of any type.</p>
                {attachments.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5">
                    {attachments.map((file) => (
                      <li key={`${file.name}-${file.size}`}>{file.name}</li>
                    ))}
                  </ul>
                )}
              </div>
            </Field>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !title.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
