"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, ApiError } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";

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
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [addingDeveloperId, setAddingDeveloperId] = useState<string | null>(null);
  const [addedDeveloperIds, setAddedDeveloperIds] = useState<string[]>([]);

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

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

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

  const addDeveloperToProject = async (developer: AdminUser) => {
    if (!selectedProjectId) {
      toast.error("Select a project first.");
      return;
    }

    if (addedDeveloperIds.includes(developer.id)) {
      return;
    }

    const selectedProject = projects.find((project) => project.id === selectedProjectId);

    try {
      setAddingDeveloperId(developer.id);
      const invite = (force = false) =>
        apiRequest(`/projects/${selectedProjectId}/invite`, {
          method: "POST",
          body: JSON.stringify({
            developerId: developer.id,
            message: `You have been invited to join ${selectedProject?.name || "this project"}`,
            force,
          }),
        });

      try {
        await invite();
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          await invite(true);
        } else {
          throw error;
        }
      }
      toast.success(`Invitation sent to ${developer.name}`);
      setAddedDeveloperIds((current) => (current.includes(developer.id) ? current : [...current, developer.id]));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to add developer to project";
      toast.error(message);
    } finally {
      setAddingDeveloperId(null);
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
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search developers by name or email"
              className="w-full pl-9 md:w-[280px]"
            />
          </div>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-full md:w-[240px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void addDeveloperToProject(u)}
                      disabled={
                        !selectedProjectId ||
                        addedDeveloperIds.includes(u.id) ||
                        addingDeveloperId === u.id
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {addedDeveloperIds.includes(u.id)
                        ? "Added"
                        : addingDeveloperId === u.id
                          ? "Adding..."
                          : "Add"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
    </div>
  );
}
