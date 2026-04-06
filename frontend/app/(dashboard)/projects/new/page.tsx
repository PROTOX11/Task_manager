"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { FolderKanban, Loader2, Search, Users } from "lucide-react";

type Developer = {
  id: string;
  name: string;
  email: string;
  code: string;
};

const splitName = (name: string) => {
  const parts = (name || "").trim().split(/\s+/);
  return {
    firstName: parts[0] || "User",
    lastName: parts.slice(1).join(" ") || "",
  };
};

export default function NewProjectPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { createProject, sendInvitation } = useData();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [githubRepository, setGithubRepository] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [isDeveloperDialogOpen, setIsDeveloperDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"name" | "email" | "code">("name");
  const [selectedDeveloperIds, setSelectedDeveloperIds] = useState<string[]>([]);
  const [loadingDevelopers, setLoadingDevelopers] = useState(true);

  useEffect(() => {
    if (!authLoading && user && user.role !== "admin") {
      router.push("/dashboard");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (authLoading || !user || user.role !== "admin") {
      return;
    }

    const loadDevelopers = async () => {
      try {
        setLoadingDevelopers(true);
        const response = await apiRequest<{ developers: Array<any> }>("/auth/developers");
        setDevelopers(
          (response.developers || []).map((developer) => ({
            id: (developer._id || developer.id).toString(),
            name: developer.name,
            email: developer.email,
            code: `DEV-${(developer._id || developer.id).toString().slice(-6).toUpperCase()}`,
          }))
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load developers";
        toast.error(message);
      } finally {
        setLoadingDevelopers(false);
      }
    };

    void loadDevelopers();
  }, [authLoading, user]);

  const visibleDevelopers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return developers;

    return developers.filter((developer) => {
      if (searchMode === "name") {
        return developer.name.toLowerCase().includes(q);
      }
      if (searchMode === "email") {
        return developer.email.toLowerCase().includes(q);
      }
      return developer.code.toLowerCase().includes(q);
    });
  }, [developers, searchMode, searchQuery]);

  const toggleDeveloper = (developerId: string) => {
    setSelectedDeveloperIds((current) =>
      current.includes(developerId)
        ? current.filter((id) => id !== developerId)
        : [...current, developerId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const project = await createProject({ name, description, githubRepository });

      const selectedDevelopers = developers.filter((developer) =>
        selectedDeveloperIds.includes(developer.id)
      );

      for (const developer of selectedDevelopers) {
        await sendInvitation(
          project.id,
          developer.email,
          `You have been invited to join ${project.name}`
        );
      }

      toast.success(
        selectedDevelopers.length > 0
          ? `Project created and ${selectedDevelopers.length} invitation(s) sent.`
          : "Project created successfully!"
      );
      router.push(`/projects/${project.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create project";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCount = selectedDeveloperIds.length;
  const selectedDevelopers = developers.filter((developer) =>
    selectedDeveloperIds.includes(developer.id)
  );

  if (authLoading || loadingDevelopers) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border bg-card p-8 text-center">
        <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Admin access required</h1>
        <p className="mt-2 text-muted-foreground">
          Only admins can create projects and assign developers.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create New Project</h1>
        <p className="text-muted-foreground">
          Set up a new project and assign developers from a searchable popup
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FolderKanban className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>
                Enter the basic information for your new project
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Field>
              <FieldLabel htmlFor="name">Project Name</FieldLabel>
              <Input
                id="name"
                placeholder="Enter project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <FieldDescription>
                Choose a clear and descriptive name for your project
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                placeholder="Describe your project..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
              <FieldDescription>
                Provide details about the project goals and scope
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="githubRepository">GitHub Repository</FieldLabel>
              <Input
                id="githubRepository"
                placeholder="https://github.com/your-org/your-repo"
                value={githubRepository}
                onChange={(e) => setGithubRepository(e.target.value)}
              />
              <FieldDescription>
                Paste the repository URL so admins and developers can open it quickly
              </FieldDescription>
            </Field>

            <div className="rounded-2xl border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Assign developers</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCount > 0
                      ? `${selectedCount} developer(s) selected`
                      : "Open the picker to choose developers"}
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={() => setIsDeveloperDialogOpen(true)}>
                  Select Developers
                </Button>
              </div>

              {selectedDevelopers.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedDevelopers.map((developer) => (
                    <Badge key={developer.id} variant="secondary" className="gap-2">
                      {developer.name}
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => toggleDeveloper(developer.id)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !name.trim()}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={isDeveloperDialogOpen} onOpenChange={setIsDeveloperDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Select developers</DialogTitle>
            <DialogDescription>
              Search by name, email, or code, then choose the developers to invite after creation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[180px_1fr]">
              <Select value={searchMode} onValueChange={(value) => setSearchMode(value as "name" | "email" | "code")}>
                <SelectTrigger>
                  <SelectValue placeholder="Search by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search by ${searchMode}...`}
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="h-[360px] rounded-lg border">
              <div className="space-y-2 p-4">
                {visibleDevelopers.map((developer) => {
                  const checked = selectedDeveloperIds.includes(developer.id);
                  const { firstName, lastName } = splitName(developer.name);

                  return (
                    <label
                      key={developer.id}
                      className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition ${
                        checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleDeveloper(developer.id)}
                      />
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{`${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{developer.name}</p>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {developer.code}
                          </Badge>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">{developer.email}</p>
                      </div>
                    </label>
                  );
                })}

                {visibleDevelopers.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No developers found for that search.
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Selected {selectedCount} developer(s)
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedDeveloperIds([]);
                  }}
                >
                  Clear
                </Button>
                <Button type="button" onClick={() => setIsDeveloperDialogOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
