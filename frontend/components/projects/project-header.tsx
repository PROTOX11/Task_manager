"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Field, FieldLabel } from "@/components/ui/field";
import { MoreHorizontal, Search, UserPlus, Settings, Trash2, Users, X, Star } from "lucide-react";
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
  const { user } = useAuth();
  const { updateProject, deleteProject, sendInvitation, removeProjectMember } = useData();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [developers, setDevelopers] = useState<DeveloperOption[]>([]);
  const [developerSearch, setDeveloperSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
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

  const contributorStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const member of project.members) {
      if (member.user.role !== "admin") {
        counts.set(member.user.id, 0);
      }
    }

    for (const panel of project.panels || []) {
      for (const task of panel.tasks || []) {
        if (task.reporter?.id) {
          counts.set(task.reporter.id, (counts.get(task.reporter.id) || 0) + 2);
        }
        if (task.assignee?.id) {
          counts.set(task.assignee.id, (counts.get(task.assignee.id) || 0) + 1);
        }
        for (const comment of task.comments || []) {
          if (comment.author?.id) {
            counts.set(comment.author.id, (counts.get(comment.author.id) || 0) + 1);
          }
        }
      }
    }

    const rankedMembers = [...project.members]
      .filter((member) => member.user.role !== "admin")
      .sort((a, b) => {
      const aScore = counts.get(a.user.id) || 0;
      const bScore = counts.get(b.user.id) || 0;
      if (bScore !== aScore) return bScore - aScore;
      return `${a.user.firstName} ${a.user.lastName}`.localeCompare(`${b.user.firstName} ${b.user.lastName}`);
    });

    return {
      rankedMembers,
      topMembers: rankedMembers.slice(0, 3),
      counts,
    };
  }, [project.members, project.panels]);

  const visibleMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    const members = [...project.members].sort((a, b) => {
      const aScore = contributorStats.counts.get(a.user.id) || 0;
      const bScore = contributorStats.counts.get(b.user.id) || 0;
      if (bScore !== aScore) return bScore - aScore;
      return `${a.user.firstName} ${a.user.lastName}`.localeCompare(`${b.user.firstName} ${b.user.lastName}`);
    });

    if (!q) return members;

    return members.filter((member) => {
      const haystack = [
        member.user.firstName,
        member.user.lastName,
        member.user.email,
        member.role,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [project.members, contributorStats.counts, memberSearch]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await sendInvitation(project.id, inviteEmail, inviteMessage);
      toast.success("Invitation sent!");
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteMessage("");
      setDeveloperSearch("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send invitation";
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    await deleteProject(project.id);
    toast.success("Project deleted");
    router.push("/dashboard");
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      setRemovingMemberId(memberId);
      await removeProjectMember(project.id, memberId);
      toast.success("Member removed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to remove member";
      toast.error(message);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleStatusChange = async (status: Project["status"]) => {
    await updateProject(project.id, { status });
    toast.success(`Project marked as ${status}`);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const avatarSizes = [
    "h-20 w-20 sm:h-24 sm:w-24",
    "h-14 w-14 sm:h-16 sm:w-16",
    "h-10 w-10 sm:h-12 sm:w-12",
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex w-full items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-bold max-[767px]:text-[1.75rem]">{project.name}</h1>
              <Badge
                variant={project.status === "active" ? "default" : "secondary"}
                className="capitalize"
              >
                {project.status}
              </Badge>
            </div>
            {project.description && (
              <p className="mt-1 text-muted-foreground max-[767px]:text-[1rem]">{project.description}</p>
            )}
          </div>
          <div className="header-right flex shrink-0 items-center gap-1 whitespace-nowrap sm:hidden">
            <Badge
              variant="secondary"
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live
            </Badge>
            <div className="top-contributors">
              {contributorStats.topMembers.slice(0, 3).map((member, index) => (
                <Avatar
                  key={member.user.id}
                  className={`border border-background shadow-sm ${
                    index === 0
                      ? "h-7 w-7"
                      : index === 1
                        ? "h-6 w-6"
                        : "h-5 w-5"
                  }`}
                >
                  <AvatarImage
                    src={member.user.avatar || undefined}
                    alt={`${member.user.firstName} ${member.user.lastName}`}
                  />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(member.user.firstName, member.user.lastName)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        </div>
        {project.githubRepository && (
          <a
            href={project.githubRepository}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center rounded-full border px-3 py-1 text-sm text-primary hover:bg-muted/60 max-[767px]:text-[1rem]"
          >
            GitHub Repo
          </a>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="hidden min-w-0 flex-1 rounded-2xl bg-gradient-to-br from-muted/30 to-background p-3 shadow-sm sm:block">
          <div className="mb-2 flex items-center justify-between gap-3">
            <Badge variant="secondary" className="shrink-0">
              Live
            </Badge>
          </div>
          <div className="mt-3 flex items-end justify-center gap-3">
            {contributorStats.topMembers.map((member, index) => (
              <HoverCard key={member.user.id} openDelay={120}>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    className={`group relative flex items-center justify-center rounded-full border-0 bg-background shadow-none transition-all duration-200 hover:-translate-y-1 hover:shadow-sm ${
                      avatarSizes[index] || avatarSizes[avatarSizes.length - 1]
                    } ${index === 0 ? "shadow-lg" : ""}`}
                    aria-label={`${member.user.firstName} ${member.user.lastName}`}
                  >
                    <Avatar className="h-full w-full">
                      <AvatarFallback className={index === 0 ? "text-xl" : index === 1 ? "text-base" : "text-sm"}>
                        {getInitials(member.user.firstName, member.user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full border bg-background text-[10px] font-semibold shadow-sm">
                      {index + 1}
                    </span>
                  </button>
                </HoverCardTrigger>
                <HoverCardContent className="w-72">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="text-sm">
                        {getInitials(member.user.firstName, member.user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">
                          {member.user.firstName} {member.user.lastName}
                        </p>
                        <Badge variant="secondary" className="shrink-0 text-[10px] capitalize">
                          {member.role}
                        </Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {member.user.email}
                      </p>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 whitespace-nowrap sm:hidden">
          <Button variant="outline" className="sm:w-full max-[767px]:px-3 max-[767px]:py-2 max-[767px]:text-[1rem]" onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="mr-2 h-4 w-4 max-[767px]:h-5 max-[767px]:w-5" />
            Invite
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 max-[767px]:h-10 max-[767px]:w-10">
                <MoreHorizontal className="h-4 w-4 max-[767px]:h-5 max-[767px]:w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleStatusChange("starred")}>
                <Star className="mr-2 h-4 w-4 max-[767px]:h-5 max-[767px]:w-5 text-yellow-500" />
                Mark as Starred
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("completed")}>
                <Settings className="mr-2 h-4 w-4 max-[767px]:h-5 max-[767px]:w-5" />
                Mark as Completed
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowMembersDialog(true)}>
                <Users className="mr-2 h-4 w-4 max-[767px]:h-5 max-[767px]:w-5" />
                View Members ({project.members.length})
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4 max-[767px]:h-5 max-[767px]:w-5" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="hidden shrink-0 items-center gap-3 whitespace-nowrap sm:flex sm:flex-col sm:items-stretch">
          <Button variant="outline" className="sm:w-full" onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite
          </Button>
        </div>

        <div className="hidden sm:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleStatusChange("starred")}>
                <Star className="mr-2 h-4 w-4 text-yellow-500" />
                Mark as Starred
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("completed")}>
                <Settings className="mr-2 h-4 w-4" />
                Mark as Completed
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowMembersDialog(true)}>
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

      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Connected Members</DialogTitle>
            <DialogDescription>
              Search members connected to this project and remove them if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="member-search">Search Members</FieldLabel>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="member-search"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search by name, email, or role"
                  className="pl-9"
                />
              </div>
            </Field>

            <ScrollArea className="max-h-96 rounded-lg border">
              <div className="space-y-2 p-3">
                {visibleMembers.map((member) => {
                  const isOwner = member.user.id === project.owner.id;
                  const canRemove = user?.role === "admin" && !isOwner && member.user.id !== user?.id;
                  return (
                    <div
                      key={member.user.id}
                      className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="text-xs">
                            {getInitials(member.user.firstName, member.user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">
                              {member.user.firstName} {member.user.lastName}
                            </p>
                            <Badge variant="secondary" className="text-[10px] capitalize">
                              {member.role}
                            </Badge>
                          </div>
                          <p className="truncate text-sm text-muted-foreground">
                            {member.user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOwner ? (
                          <Badge variant="outline" className="text-[10px]">
                            Owner
                          </Badge>
                        ) : null}
                        {canRemove ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => void handleRemoveMember(member.user.id)}
                            disabled={removingMemberId === member.user.id}
                            title="Remove member"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                {visibleMembers.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No members found.
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMembersDialog(false)}>
              Close
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
