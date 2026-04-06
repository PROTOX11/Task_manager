"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, ApiError } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FolderKanban, Plus, Search, Shield, User, Users } from "lucide-react";

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
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [roleFilter, setRoleFilter] = useState<"developers" | "all" | "admins">("developers");
  const [selectedDeveloper, setSelectedDeveloper] = useState<AdminUser | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && user && user.role !== "admin") {
      router.push("/dashboard");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (isLoading || !user || user.role !== "admin") {
      return;
    }

    const load = async () => {
      try {
        setErrorMessage("");
        setIsLoadingData(true);
        const [usersResponse, projectsResponse] = await Promise.all([
          apiRequest<{ users: Array<any> }>("/auth/users"),
          apiRequest<{ projects: Array<any> }>("/projects/all"),
        ]);
        setUsers((usersResponse.users || []).map(mapAdminUser));
        setProjects((projectsResponse.projects || []).map(mapAdminProject));
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          toast.error("Your session expired. Please sign in again.");
          router.push("/");
          return;
        }
        const message = error instanceof Error ? error.message : "Unable to load users";
        setErrorMessage(message);
        toast.error(message);
      } finally {
        setIsLoadingData(false);
      }
    };

    void load();
  }, [isLoading, user]);

  const developers = users.filter((u) => u.role === "developer");
  const admins = users.filter((u) => u.role === "admin");

  const visibleUsers = useMemo(() => {
    const roleFiltered =
      roleFilter === "all" ? users : roleFilter === "admins" ? admins : developers;
    const q = userSearch.trim().toLowerCase();
    const searchFiltered = q
      ? roleFiltered.filter((user) => {
          return (
            user.name.toLowerCase().includes(q) ||
            user.email.toLowerCase().includes(q) ||
            user.code.toLowerCase().includes(q)
          );
        })
      : roleFiltered;

    return searchFiltered.slice(0, 10);
  }, [admins, developers, roleFilter, userSearch, users]);

  if (isLoading || isLoadingData) {
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

  const adminProjects = projects.filter((project) => project.createdBy.id === user.id);
  const filteredProjects = adminProjects.filter((project) => {
    const q = projectSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      project.name.toLowerCase().includes(q) ||
      project.description.toLowerCase().includes(q) ||
      project.id.toLowerCase().includes(q)
    );
  });

  const openProjectDialog = (developer: AdminUser) => {
    setSelectedDeveloper(developer);
    setSelectedProjectId("");
    setProjectSearch("");
    setIsProjectDialogOpen(true);
  };

  const handleAddToProject = async () => {
    if (!selectedDeveloper || !selectedProjectId) {
      toast.error("Select a project first.");
      return;
    }

    const selectedProject = projects.find((project) => project.id === selectedProjectId);

    try {
      await apiRequest(`/projects/${selectedProjectId}/invite`, {
        method: "POST",
        body: JSON.stringify({
          developerId: selectedDeveloper.id,
          message: `You have been invited to join ${selectedProject?.name || "this project"}`,
        }),
      });
      toast.success(`Invitation sent to ${selectedDeveloper.name}`);
      setIsProjectDialogOpen(false);
      setSelectedDeveloper(null);
      setSelectedProjectId("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to add developer to project";
      toast.error(message);
    }
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
            View all developers and add them to your projects
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by name, email, or code"
              className="w-full pl-9 md:w-[280px]"
            />
          </div>
          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as typeof roleFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="developers">Developers</SelectItem>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="admins">Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2">
                <Shield className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{admins.length}</p>
                <p className="text-sm text-muted-foreground">Administrators</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2">
                <User className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{developers.length}</p>
                <p className="text-sm text-muted-foreground">Developers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Developers can be added to projects from this screen. Showing up to 10 results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleUsers.map((u) => (
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
                    {u.role === "developer" ? (
                      <Button variant="outline" size="sm" onClick={() => openProjectDialog(u)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add to Project
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">Admin user</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {visibleUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No users match this filter
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add {selectedDeveloper?.name} to a project</DialogTitle>
            <DialogDescription>
              Select one of your projects created as an admin. Search uses project name, description, or code.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                placeholder="Search your projects..."
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[320px] rounded-lg border">
              <div className="space-y-2 p-4">
                {filteredProjects.map((project) => {
                  const alreadyInProject =
                    selectedDeveloper &&
                    project.developers.some((dev) => dev.id === selectedDeveloper.id);

                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => setSelectedProjectId(project.id)}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        selectedProjectId === project.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <FolderKanban className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">{project.name}</p>
                            <Badge variant="outline" className="capitalize">
                              {project.status}
                            </Badge>
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {project.description || "No description provided"}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Created by {project.createdBy.name} · {project.id.slice(-6).toUpperCase()}
                          </p>
                        </div>
                        {alreadyInProject && (
                          <Badge variant="secondary">Already in project</Badge>
                        )}
                      </div>
                    </button>
                  );
                })}

                {filteredProjects.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No projects found for this admin.
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsProjectDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddToProject} disabled={!selectedProjectId}>
                Add to Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
