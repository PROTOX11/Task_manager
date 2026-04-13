"use client";

import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-context";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  LayoutGrid,
  ListFilter,
  Search,
  Sparkles,
  Users2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const statusFilters = ["all", "active", "completed", "archived"] as const;
const sortOptions = ["recent", "progress", "name"] as const;

type StatusFilter = (typeof statusFilters)[number];
type SortOption = (typeof sortOptions)[number];

function getTaskStats(project: Project) {
  const tasks = project.panels.flatMap((panel) => panel.tasks);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const activeTasks = tasks.filter((task) => task.status === "in_progress").length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return { totalTasks, completedTasks, activeTasks, progress };
}

function getStatusStyles(status: Project["status"]) {
  switch (status) {
    case "active":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "completed":
      return "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-400";
    default:
      return "border-zinc-500/20 bg-zinc-500/10 text-zinc-700 dark:text-zinc-400";
  }
}

function MetricCard({
  icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  helper: string;
  tone: string;
}) {
  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={cn("rounded-xl p-3", tone)}>{icon}</div>
          <div className="min-w-0">
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const { totalTasks, completedTasks, activeTasks, progress } = getTaskStats(project);
  const memberCount = project.members.length;
  const panelCount = project.panels.length;

  return (
    <Card className="group overflow-hidden border-border/60 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <CardDescription className="line-clamp-2 min-h-10">{project.description}</CardDescription>
          </div>
          <Badge className={cn("shrink-0 border capitalize", getStatusStyles(project.status))}>
            {project.status}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users2 className="h-4 w-4" />
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LayoutGrid className="h-4 w-4" />
            {panelCount} panels
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {format(parseISO(project.createdAt), "MMM d, yyyy")}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>{totalTasks} total tasks</span>
            <span>{completedTasks} completed</span>
            <span>{activeTasks} in progress</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">{project.owner.firstName} {project.owner.lastName}</p>
            <p className="text-xs text-muted-foreground">Project owner</p>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/projects/${project.id}`}>
              Open
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminProjectsPage() {
  const { user } = useAuth();
  const { projects } = useData();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard");
    }
  }, [user, router]);

  const metrics = useMemo(() => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter((project) => project.status === "active").length;
    const completedProjects = projects.filter((project) => project.status === "completed").length;
    const totalTasks = projects.reduce((sum, project) => sum + getTaskStats(project).totalTasks, 0);
    const averageProgress =
      totalProjects > 0
        ? Math.round(
            projects.reduce((sum, project) => sum + getTaskStats(project).progress, 0) / totalProjects
          )
        : 0;

    return { totalProjects, activeProjects, completedProjects, totalTasks, averageProgress };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...projects]
      .filter((project) => {
        const searchableText = [
          project.name,
          project.description,
          project.owner.firstName,
          project.owner.lastName,
          project.owner.email,
        ]
          .join(" ")
          .toLowerCase();

        const matchesSearch = query.length === 0 || searchableText.includes(query);
        const matchesStatus = statusFilter === "all" || project.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }

        if (sortBy === "progress") {
          return getTaskStats(b).progress - getTaskStats(a).progress;
        }

        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [projects, search, sortBy, statusFilter]);

  if (user?.role !== "admin") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md border-border/60 shadow-sm">
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold">Redirecting to dashboard</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Only administrators can access the projects overview.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/40 p-6 shadow-sm md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_28%)]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge variant="secondary" className="w-fit gap-1.5 rounded-full px-3 py-1">
              <FolderKanban className="h-3.5 w-3.5" />
              Projects overview
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Manage projects with a cleaner, calmer workspace
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground md:text-base">
                Review ownership, progress, and activity across every project without the noise of a dense table.
              </p>
            </div>
          </div>

          <Button asChild size="lg" className="shrink-0">
            <Link href="/projects/new">
              Create project
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={<FolderKanban className="h-5 w-5 text-amber-700 dark:text-amber-300" />}
          label="Total projects"
          value={metrics.totalProjects}
          helper="All projects visible to admins"
          tone="bg-amber-500/10"
        />
        <MetricCard
          icon={<Sparkles className="h-5 w-5 text-sky-700 dark:text-sky-300" />}
          label="Active projects"
          value={metrics.activeProjects}
          helper="Currently in motion"
          tone="bg-sky-500/10"
        />
        <MetricCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />}
          label="Completed"
          value={metrics.completedProjects}
          helper="Projects already delivered"
          tone="bg-emerald-500/10"
        />
        <MetricCard
          icon={<ListFilter className="h-5 w-5 text-violet-700 dark:text-violet-300" />}
          label="Total tasks"
          value={metrics.totalTasks}
          helper="Work items tracked across projects"
          tone="bg-violet-500/10"
        />
        <MetricCard
          icon={<LayoutGrid className="h-5 w-5 text-rose-700 dark:text-rose-300" />}
          label="Avg. progress"
          value={`${metrics.averageProgress}%`}
          helper="Average completion across all projects"
          tone="bg-rose-500/10"
        />
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>All Projects</CardTitle>
              <CardDescription>Search, filter, and open projects from one place.</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{filteredProjects.length} shown</span>
              <span>•</span>
              <span>{projects.length} total</span>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by project name, description, owner, or email"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {statusFilters.map((filter) => (
                <Button
                  key={filter}
                  type="button"
                  variant={statusFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(filter)}
                  className="capitalize"
                >
                  {filter}
                </Button>
              ))}
            </div>

            <div className="flex gap-2">
              {sortOptions.map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={sortBy === option ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSortBy(option)}
                  className="capitalize"
                >
                  {option === "recent" ? "Recent" : option}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredProjects.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-background shadow-sm">
                <FolderKanban className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No projects found</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Try a different search term or clear the filters to bring projects back into view.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={() => setSearch("")}>
                  Clear search
                </Button>
                <Button variant="ghost" onClick={() => setStatusFilter("all")}>
                  Reset filter
                </Button>
                <Button asChild>
                  <Link href="/projects/new">Create project</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
