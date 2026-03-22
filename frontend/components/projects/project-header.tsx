"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Field, FieldLabel } from "@/components/ui/field";
import { MoreHorizontal, UserPlus, Settings, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import type { Project } from "@/lib/types";

interface ProjectHeaderProps {
  project: Project;
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const router = useRouter();
  const { updateProject, deleteProject, sendInvitation } = useData();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    await sendInvitation(project.id, inviteEmail, inviteMessage);
    toast.success("Invitation sent!");
    setShowInviteDialog(false);
    setInviteEmail("");
    setInviteMessage("");
  };

  const handleDelete = async () => {
    await deleteProject(project.id);
    toast.success("Project deleted");
    router.push("/dashboard");
  };

  const handleStatusChange = async (status: Project["status"]) => {
    await updateProject(project.id, { status });
    toast.success(`Project marked as ${status}`);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <Badge
            variant={project.status === "active" ? "default" : "secondary"}
            className="capitalize"
          >
            {project.status}
          </Badge>
        </div>
        {project.description && (
          <p className="mt-1 text-muted-foreground">{project.description}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {project.members.slice(0, 4).map((member) => (
            <Avatar key={member.user.id} className="border-2 border-background">
              <AvatarFallback className="text-xs">
                {getInitials(member.user.firstName, member.user.lastName)}
              </AvatarFallback>
            </Avatar>
          ))}
          {project.members.length > 4 && (
            <Avatar className="border-2 border-background">
              <AvatarFallback className="text-xs">
                +{project.members.length - 4}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        <Button variant="outline" onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleStatusChange("active")}>
              <Settings className="mr-2 h-4 w-4" />
              Mark as Active
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("completed")}>
              <Settings className="mr-2 h-4 w-4" />
              Mark as Completed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("archived")}>
              <Settings className="mr-2 h-4 w-4" />
              Archive Project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Users className="mr-2 h-4 w-4" />
              View Members ({project.members.length})
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to collaborate on this project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="email">Email Address</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="message">Message (Optional)</FieldLabel>
              <Input
                id="message"
                placeholder="Add a personal message..."
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={!inviteEmail.trim()}>
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{project.name}&rdquo;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
