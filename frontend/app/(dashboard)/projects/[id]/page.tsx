"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useData } from "@/lib/data-context";
import { KanbanBoard } from "@/components/projects/kanban-board";
import { ProjectHeader } from "@/components/projects/project-header";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import type { Task } from "@/lib/types";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { getProjectById } = useData();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createTaskPanelId, setCreateTaskPanelId] = useState<string | null>(null);

  const project = getProjectById(params.id as string);

  if (!project) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Project not found</h2>
          <p className="mt-2 text-muted-foreground">
            The project you&apos;re looking for doesn&apos;t exist.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 text-primary hover:underline"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProjectHeader project={project} />
      <KanbanBoard
        project={project}
        onTaskClick={setSelectedTask}
        onAddTask={setCreateTaskPanelId}
      />

      <TaskDialog
        task={selectedTask}
        project={project}
        onClose={() => setSelectedTask(null)}
      />

      <CreateTaskDialog
        projectId={project.id}
        panelId={createTaskPanelId}
        onClose={() => setCreateTaskPanelId(null)}
      />
    </div>
  );
}
