"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { ChevronDown, Plus, Search } from "lucide-react";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "developer";
  createdAt: string;
  code: string;
};

type AdminProject = {
  id: string;
  name: string;
  description: string;
  status: "active" | "completed" | "archived";
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  developers: Array<{
    id: string;
    name: string;
    email: string;
  }>;
};

const splitName = (name: string) => {
  const parts = (name || "").trim().split(/\s+/);
  return {
    firstName: parts[0] || "User",
    lastName: parts.slice(1).join(" ") || "",
  };
};

const mapAdminUser = (user: any): AdminUser => {
  const name = user.name || [user.firstName, user.lastName].filter(Boolean).join(" ");
  const code = (user._id || user.id || "").toString().slice(-6).toUpperCase();
  return {
    id: (user._id || user.id || "").toString(),
    name,
    email: user.email,
    role: user.role === "admin" ? "admin" : "developer",
    createdAt: user.createdAt || new Date().toISOString(),
    code: `DEV-${code || "000000"}`,
  };
};

const mapAdminProject = (project: any): AdminProject => ({
  id: (project._id || project.id).toString(),
  name: project.name,
  description: project.description || "",
  status: project.status || "active",
  createdAt: project.createdAt || new Date().toISOString(),
  createdBy: {
    id: (project.createdBy?._id || project.createdBy?.id || "").toString(),
    name: project.createdBy?.name || "Admin",
    email: project.createdBy?.email || "",
  },
  developers: (project.developers || []).map((dev: any) => ({
    id: (dev._id || dev.id || "").toString(),
    name: dev.name || "Developer",
    email: dev.email || "",
  })),
});

export default function AdminUsersPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [search, setSearch] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [invitingTarget, setInvitingTarget] = useState<{ projectId: string; developerId: string } | null>(null);
  const [invitedDeveloperIdsByProject, setInvitedDeveloperIdsByProject] = useState<Record<string, string[]>>({});
  const [openDropdownUserId, setOpenDropdownUserId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!isLoading && user && user.role !== "admin") {
      router.push("/dashboard");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (isLoading || !user || user.role !== "admin") {
      return;
    }

    const loadProjects = async () => {
      try {
        setErrorMessage("");
        const projectsResponse = await apiRequest<{ projects: Array<any> }>("/projects/all");
        setProjects((projectsResponse.projects || []).map(mapAdminProject));
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          toast.error("Your session expired. Please sign in again.");
          router.push("/");
          return;
        }
        const message = error instanceof Error ? error.message : "Unable to load projects";
        setErrorMessage(message);
        toast.error(message);
      }
    };

    void loadProjects();
  }, [isLoading, user, router]);

  // Mount flag for portal
  useEffect(() => { setMounted(true); }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownUserId(null);
        setDropdownPos(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getProjectDeveloperIds = (projectId: string) =>
    new Set((projects.find((p) => p.id === projectId)?.developers || []).map((d) => d.id));

  const isAlreadyInProject = (developerId: string, projectId: string) =>
    getProjectDeveloperIds(projectId).has(developerId);

  const isAlreadyInvited = (developerId: string, projectId: string) =>
    (invitedDeveloperIdsByProject[projectId] || []).includes(developerId);

  useEffect(() => {
    if (isLoading || !user || user.role !== "admin") {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      const load = async () => {
        try {
          setErrorMessage("");
          setLoading(true);
          const response = await apiRequest<{ users: Array<any> }>(
            `/auth/users?search=${encodeURIComponent(search.trim())}`,
            { signal: controller.signal }
          );
          setFilteredUsers((response.users || []).map(mapAdminUser));
        } catch (error) {
          if (controller.signal.aborted) return;
          if (error instanceof ApiError && error.status === 401) {
            toast.error("Your session expired. Please sign in again.");
            router.push("/");
            return;
          }
          const message = error instanceof Error ? error.message : "Unable to load users";
          setErrorMessage(message);
          toast.error(message);
        } finally {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        }
      };

      void load();
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [isLoading, user, router, search]);

  const addDeveloperToProject = async (developer: AdminUser, projectId: string) => {
    const project = projects.find((p) => p.id === projectId);

    if (isAlreadyInProject(developer.id, projectId)) {
      toast.info(`${developer.name} is already in ${project?.name || "this project"}.`);
      return;
    }

    if (isAlreadyInvited(developer.id, projectId)) {
      return;
    }

    setOpenDropdownUserId(null);

    try {
      setInvitingTarget({ projectId, developerId: developer.id });
      await apiRequest(`/projects/${projectId}/invite`, {
        method: "POST",
        body: JSON.stringify({
          developerId: developer.id,
          message: `You have been invited to join ${project?.name || "this project"}`,
        }),
      });
      toast.success(`Invitation sent to ${developer.name} for ${project?.name}`);
      setInvitedDeveloperIdsByProject((current) => ({
        ...current,
        [projectId]: current[projectId]?.includes(developer.id)
          ? current[projectId]
          : [...(current[projectId] || []), developer.id],
      }));
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast.info(`${developer.name} is already in ${project?.name || "this project"}.`);
        setInvitedDeveloperIdsByProject((current) => ({
          ...current,
          [projectId]: current[projectId]?.includes(developer.id)
            ? current[projectId]
            : [...(current[projectId] || []), developer.id],
        }));
        return;
      }
      const message = error instanceof Error ? error.message : "Unable to add developer to project";
      toast.error(message);
    } finally {
      setInvitingTarget(null);
    }
  };

  const showInitialLoader = isLoading || (loading && filteredUsers.length === 0 && !errorMessage);

  if (showInitialLoader) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return null;
  }

  const formatJoinedDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Unknown" : format(date, "MMM d, yyyy");
  };

  const getInitials = (name: string) => {
    const { firstName, lastName } = splitName(name);
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };



  if (errorMessage) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border bg-card p-8 text-center">
        <h1 className="text-2xl font-semibold">Unable to load users</h1>
        <p className="mt-2 text-muted-foreground">{errorMessage}</p>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Search developers by name or email, then add them to a project
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search developers by name or email"
            className="w-full pl-9 md:w-[280px]"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Developers</CardTitle>
          <CardDescription>
            Search results are loaded from the database and shown in this list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && filteredUsers.length > 0 ? (
            <p className="mb-3 text-sm text-muted-foreground">Refreshing developers...</p>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Add to Project</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => {
                const isBusy = invitingTarget?.developerId === u.id;
                const isOpen = openDropdownUserId === u.id;

                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{u.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{u.code}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                        {u.role === "admin" ? "Administrator" : "Developer"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatJoinedDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-block">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isBusy || projects.length === 0}
                          onClick={(e) => {
                            if (isOpen) {
                              setOpenDropdownUserId(null);
                              setDropdownPos(null);
                            } else {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setDropdownPos({
                                top: rect.bottom + window.scrollY + 4,
                                right: window.innerWidth - rect.right,
                              });
                              setOpenDropdownUserId(u.id);
                            }
                          }}
                          className="transition-all duration-200 ease-in-out"
                        >
                          {isBusy ? (
                            <Spinner className="mr-2 h-4 w-4" />
                          ) : (
                            <Plus className="mr-1.5 h-4 w-4" />
                          )}
                          {isBusy ? "Inviting..." : "Add to Project"}
                          <ChevronDown
                            className={cn(
                              "ml-1.5 h-3.5 w-3.5 transition-transform duration-200",
                              isOpen && "rotate-180"
                            )}
                          />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredUsers.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No developers match this search
                  </TableCell>
                </TableRow>
              )}
              {loading && filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Loading developers...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Portal dropdown — renders above everything, fixed to viewport */}
      {mounted && openDropdownUserId && dropdownPos &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: dropdownPos.top,
              right: dropdownPos.right,
              zIndex: 9999,
            }}
            className="min-w-[220px] rounded-lg border bg-popover shadow-xl ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95"
          >
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
              Select project
            </p>
            <ul className="max-h-60 overflow-y-auto py-1">
              {projects.map((project) => {
                const u = filteredUsers.find((usr) => usr.id === openDropdownUserId)!;
                const inProject = u ? isAlreadyInProject(u.id, project.id) : false;
                const invited = u ? isAlreadyInvited(u.id, project.id) : false;
                const disabled = inProject || invited;
                return (
                  <li key={project.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => u && void addDeveloperToProject(u, project.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-sm transition-colors",
                        disabled
                          ? "cursor-not-allowed text-muted-foreground"
                          : "cursor-pointer hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <span className="truncate">{project.name}</span>
                      {inProject && (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">Member</Badge>
                      )}
                      {invited && !inProject && (
                        <Badge variant="outline" className="shrink-0 text-[10px]">Invited</Badge>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body
        )
      }
    </div>
  );
}
