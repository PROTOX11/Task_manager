"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Field, FieldLabel } from "@/components/ui/field";
import { MoreHorizontal, Search, UserPlus, Settings, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import type { Project } from "@/lib/types";

type DeveloperOption = {
  id: string;
  name: string;
  email: string;
  code: string;
};

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
  const [developers, setDevelopers] = useState<DeveloperOption[]>([]);
  const [developerSearch, setDeveloperSearch] = useState("");
  const [loadingDevelopers, setLoadingDevelopers] = useState(false);

  useEffect(() => {
    if (!showInviteDialog) return;

    let isMounted = true;

    const loadDevelopers = async () => {
      try {
        setLoadingDevelopers(true);
        const response = await apiRequest<{ developers: Array<any> }>("/auth/developers");
        if (!isMounted) return;

        setDevelopers(
          (response.developers || []).map((developer) => {
            const id = (developer._id || developer.id).toString();
            return {
              id,
              name: developer.name,
              email: developer.email,
              code: `DEV-${id.slice(-6).toUpperCase()}`,
            };
          })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load developers";
        toast.error(message);
      } finally {
        if (isMounted) {
          setLoadingDevelopers(false);
        }
      }
    };

    void loadDevelopers();

    return () => {
      isMounted = false;
    };
  }, [showInviteDialog]);

  const visibleDevelopers = useMemo(() => {
    const q = developerSearch.trim().toLowerCase();
    const filtered = q
      ? developers.filter((developer) => {
          return (
            developer.name.toLowerCase().includes(q) ||
            developer.email.toLowerCase().includes(q) ||
            developer.code.toLowerCase().includes(q)
          );
        })
      : developers;

    return filtered.slice(0, 10);
  }, [developers, developerSearch]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    await sendInvitation(project.id, inviteEmail, inviteMessage);
    toast.success("Invitation sent!");
    setShowInviteDialog(false);
    setInviteEmail("");
    setInviteMessage("");
    setDeveloperSearch("");
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
        {project.githubRepository && (
          <a
            href={project.githubRepository}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center rounded-full border px-3 py-1 text-sm text-primary hover:bg-muted/60"
          >
            GitHub Repo
          </a>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="min-w-0 flex-1 rounded-2xl border bg-gradient-to-br from-muted/30 to-background p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Connected members
              </p>
              <p className="text-xs text-muted-foreground">
                {project.members.length} people connected to this project
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              Live
            </Badge>
          </div>
          <ScrollArea className="max-h-24">
            <div className="grid gap-1.5 pr-2 sm:grid-cols-2 xl:grid-cols-3">
              {project.members.map((member) => (
                <div
                  key={member.user.id}
                  className="flex items-center gap-2 rounded-xl border bg-background/90 px-2.5 py-2 shadow-sm transition-colors hover:bg-muted/40"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(member.user.firstName, member.user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {member.user.firstName} {member.user.lastName}
                      </p>
                      <Badge variant="secondary" className="shrink-0 text-[9px] capitalize">
                        {member.role}
                      </Badge>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{member.user.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-stretch">
          <Button variant="outline" className="sm:w-full" onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
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
              Send an invitation to collaborate on this project. You can search all
              developers on the platform and pick from the first 10 matches.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="developer-search">Search Developers</FieldLabel>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="developer-search"
                  value={developerSearch}
                  onChange={(e) => setDeveloperSearch(e.target.value)}
                  placeholder="Search by name, email, or code"
                  className="pl-9"
                />
              </div>
            </Field>

            <ScrollArea className="max-h-64 rounded-lg border">
              <div className="space-y-2 p-3">
                {loadingDevelopers ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Loading developers...
                  </div>
                ) : (
                  visibleDevelopers.map((developer) => {
                    const selected = inviteEmail.toLowerCase() === developer.email.toLowerCase();
                    return (
                      <button
                        key={developer.id}
                        type="button"
                        onClick={() => setInviteEmail(developer.email)}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                          selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{developer.name}</p>
                          <p className="truncate text-sm text-muted-foreground">{developer.email}</p>
                        </div>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {developer.code}
                        </Badge>
                      </button>
                    );
                  })
                )}

                {!loadingDevelopers && visibleDevelopers.length === 0 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No developers found.
                  </div>
                )}
              </div>
            </ScrollArea>

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
