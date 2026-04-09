"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  GripVertical,
  MessageSquare,
  Paperclip,
  CheckSquare,
  Calendar,
  Columns3,
  Rows3,
} from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { toast } from "sonner";
import type { Project, Task, Panel } from "@/lib/types";

interface KanbanBoardProps {
  project: Project;
  onTaskClick: (task: Task) => void;
  onAddTask: (panelId: string) => void;
}

export function KanbanBoard({ project, onTaskClick, onAddTask }: KanbanBoardProps) {
  const { user } = useAuth();
  const { addPanel, updatePanel, deletePanel, moveTask, reorderPanels } = useData();
  const isAdmin = user?.role === "admin";
  const [panelLayout, setPanelLayout] = useState<"horizontal" | "vertical">("horizontal");
  const [addingPanel, setAddingPanel] = useState(false);
  const [newPanelName, setNewPanelName] = useState("");
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);
  const [editingPanelName, setEditingPanelName] = useState("");
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [draggedPanelId, setDraggedPanelId] = useState<string | null>(null);
  const [panelDropTargetId, setPanelDropTargetId] = useState<string | null>(null);
  const [panelOrder, setPanelOrder] = useState<string[]>([]);

  useEffect(() => {
    setPanelOrder([...project.panels].sort((a, b) => a.order - b.order).map((panel) => panel.id));
  }, [project.id, project.panels]);

  const panelMap = new Map(project.panels.map((panel) => [panel.id, panel] as const));
  const sortedPanels = panelOrder.length
    ? panelOrder.map((panelId) => panelMap.get(panelId)).filter((panel): panel is Panel => Boolean(panel))
    : [...project.panels].sort((a, b) => a.order - b.order);

  const canModifyTask = (task: Task) => Boolean(user && task);

  const handleAddPanel = async () => {
    if (!newPanelName.trim()) return;
    await addPanel(project.id, newPanelName);
    setNewPanelName("");
    setAddingPanel(false);
    toast.success("Panel added");
  };

  const handleUpdatePanel = async (panelId: string) => {
    if (!editingPanelName.trim()) return;
    await updatePanel(project.id, panelId, { name: editingPanelName });
    setEditingPanelId(null);
    setEditingPanelName("");
    toast.success("Panel updated");
  };

  const handleDeletePanel = async (panelId: string) => {
    await deletePanel(project.id, panelId);
    toast.success("Panel deleted");
  };

  const handleTaskDragStart = (task: Task) => {
    setDraggedTask(task);
    setDraggedPanelId(null);
    setPanelDropTargetId(null);
  };

  const handlePanelDragStart = (panelId: string) => {
    setDraggedPanelId(panelId);
    setDraggedTask(null);
    setPanelDropTargetId(panelId);
    setPanelOrder((currentOrder) =>
      currentOrder.length ? currentOrder : [...project.panels].sort((a, b) => a.order - b.order).map((panel) => panel.id)
    );
  };

  const handlePanelDragEnd = () => {
    setDraggedPanelId(null);
    setPanelDropTargetId(null);
  };

  const handleTaskDrop = async (panelId: string) => {
    if (draggedTask && draggedTask.panelId !== panelId) {
      try {
        await moveTask(draggedTask.id, panelId);
        toast.success("Task moved");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to move task";
        toast.error(message);
      }
    }
    setDraggedTask(null);
    setPanelDropTargetId(null);
  };

  const handlePanelDrop = async (targetPanelId: string) => {
    if (!draggedPanelId || draggedPanelId === targetPanelId) {
      handlePanelDragEnd();
      return;
    }

    const movingIndex = panelOrder.findIndex((panelId) => panelId === draggedPanelId);
    const targetIndex = panelOrder.findIndex((panelId) => panelId === targetPanelId);

    if (movingIndex < 0 || targetIndex < 0) {
      handlePanelDragEnd();
      return;
    }

    const nextOrder = [...panelOrder];
    const [movingPanelId] = nextOrder.splice(movingIndex, 1);
    const adjustedTargetIndex = movingIndex < targetIndex ? targetIndex - 1 : targetIndex;
    nextOrder.splice(adjustedTargetIndex, 0, movingPanelId);
    setPanelOrder(nextOrder);

    await reorderPanels(project.id, nextOrder);
    toast.success("Panels reordered");
    handlePanelDragEnd();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-l-red-500";
      case "high":
        return "border-l-orange-500";
      case "medium":
        return "border-l-yellow-500";
      default:
        return "border-l-blue-500";
    }
  };

  return (
    <div className="max-w-full space-y-3 overflow-hidden">
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() =>
            setPanelLayout((current) => (current === "horizontal" ? "vertical" : "horizontal"))
          }
          className="shrink-0 rounded-full"
          title={panelLayout === "horizontal" ? "Switch to vertical scroll" : "Switch to horizontal scroll"}
        >
          {panelLayout === "horizontal" ? (
            <Rows3 className="h-4 w-4" />
          ) : (
            <Columns3 className="h-4 w-4" />
          )}
        </Button>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {panelLayout === "horizontal" ? "Horizontal" : "Vertical"}
        </span>
      </div>

      {panelLayout === "horizontal" ? (
        <div className="w-full min-w-0 max-w-full overflow-hidden">
          <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden pb-3 [scrollbar-gutter:stable_both-edges] [scroll-snap-type:x_mandatory]">
            <div className="flex w-max min-w-full items-start gap-4 pr-2">
              {sortedPanels.map((panel) => (
                <PanelColumn
                  key={panel.id}
                  panel={panel}
                  layout={panelLayout}
                  onTaskClick={onTaskClick}
                  onAddTask={onAddTask}
                  onEdit={() => {
                    setEditingPanelId(panel.id);
                    setEditingPanelName(panel.name);
                  }}
                  onDelete={() => handleDeletePanel(panel.id)}
                  editingPanelId={editingPanelId}
                  editingPanelName={editingPanelName}
                  setEditingPanelName={setEditingPanelName}
                  onSaveEdit={() => handleUpdatePanel(panel.id)}
                  onCancelEdit={() => setEditingPanelId(null)}
                  onDragStart={handleTaskDragStart}
                  onDropTask={() => handleTaskDrop(panel.id)}
                  canModifyTask={canModifyTask}
                  getPriorityColor={getPriorityColor}
                  showPanelActions={isAdmin}
                  showAddTask={isAdmin}
                  onPanelDragStart={handlePanelDragStart}
                  onPanelDragEnd={handlePanelDragEnd}
                  onPanelDrop={() => handlePanelDrop(panel.id)}
                  onPanelDragOver={(event) => {
                    setPanelDropTargetId(panel.id);
                    if (!draggedPanelId || draggedPanelId === panel.id) return;

                    const rect = event.currentTarget.getBoundingClientRect();
                    const cursorX = event.clientX;

                    setPanelOrder((currentOrder) => {
                      const activeOrder = currentOrder.length
                        ? currentOrder
                        : [...project.panels].sort((a, b) => a.order - b.order).map((item) => item.id);
                      const fromIndex = activeOrder.findIndex((panelId) => panelId === draggedPanelId);
                      const toIndex = activeOrder.findIndex((panelId) => panelId === panel.id);
                      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return activeOrder;

                      const insertAfter = cursorX > rect.left + rect.width / 2;
                      const targetIndex = insertAfter ? toIndex + 1 : toIndex;

                      const nextOrder = [...activeOrder];
                      const [movingPanelId] = nextOrder.splice(fromIndex, 1);
                      const adjustedTargetIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
                      nextOrder.splice(adjustedTargetIndex, 0, movingPanelId);
                      return nextOrder;
                    });
                  }}
                  isPanelDropTarget={panelDropTargetId === panel.id}
                  onResize={async (dimensions) => {
                    await updatePanel(project.id, panel.id, dimensions);
                  }}
                />
              ))}

              {isAdmin && addingPanel ? (
                <Card className="w-72 shrink-0">
                  <CardContent className="p-3">
                    <Input
                      placeholder="Panel name"
                      value={newPanelName}
                      onChange={(e) => setNewPanelName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddPanel();
                        if (e.key === "Escape") setAddingPanel(false);
                      }}
                      autoFocus
                    />
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={handleAddPanel}>
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAddingPanel(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : isAdmin ? (
                <Button
                  variant="outline"
                  className="h-auto w-72 shrink-0 justify-start py-3"
                  onClick={() => setAddingPanel(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Panel
                </Button>
              ) : null}
            </div>
          </div>
          <div className="mt-1 h-2 w-full rounded-full bg-muted/60" aria-hidden="true">
            <div className="h-full w-24 rounded-full bg-muted-foreground/40" />
          </div>
        </div>
      ) : (
        <div className="h-[72vh] w-full overflow-y-auto overflow-x-hidden pr-1">
          <div className="flex flex-col items-stretch gap-4 pb-4">
            {sortedPanels.map((panel) => (
              <PanelColumn
                key={panel.id}
                panel={panel}
                layout={panelLayout}
                onTaskClick={onTaskClick}
                onAddTask={onAddTask}
                onEdit={() => {
                  setEditingPanelId(panel.id);
                  setEditingPanelName(panel.name);
                }}
                onDelete={() => handleDeletePanel(panel.id)}
                editingPanelId={editingPanelId}
                editingPanelName={editingPanelName}
                setEditingPanelName={setEditingPanelName}
                onSaveEdit={() => handleUpdatePanel(panel.id)}
                onCancelEdit={() => setEditingPanelId(null)}
                onDragStart={handleTaskDragStart}
                onDropTask={() => handleTaskDrop(panel.id)}
                canModifyTask={canModifyTask}
                getPriorityColor={getPriorityColor}
                showPanelActions={isAdmin}
                showAddTask={isAdmin}
                onPanelDragStart={handlePanelDragStart}
                onPanelDragEnd={handlePanelDragEnd}
                onPanelDrop={() => handlePanelDrop(panel.id)}
                onPanelDragOver={(event) => {
                  setPanelDropTargetId(panel.id);
                  if (!draggedPanelId || draggedPanelId === panel.id) return;

                  const rect = event.currentTarget.getBoundingClientRect();
                  const cursorY = event.clientY;

                  setPanelOrder((currentOrder) => {
                    const activeOrder = currentOrder.length
                      ? currentOrder
                      : [...project.panels].sort((a, b) => a.order - b.order).map((item) => item.id);
                    const fromIndex = activeOrder.findIndex((panelId) => panelId === draggedPanelId);
                    const toIndex = activeOrder.findIndex((panelId) => panelId === panel.id);
                    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return activeOrder;

                    const insertAfter = cursorY > rect.top + rect.height / 2;
                    const targetIndex = insertAfter ? toIndex + 1 : toIndex;

                    const nextOrder = [...activeOrder];
                    const [movingPanelId] = nextOrder.splice(fromIndex, 1);
                    const adjustedTargetIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
                    nextOrder.splice(adjustedTargetIndex, 0, movingPanelId);
                    return nextOrder;
                  });
                }}
                isPanelDropTarget={panelDropTargetId === panel.id}
                onResize={async (dimensions) => {
                  await updatePanel(project.id, panel.id, dimensions);
                }}
              />
            ))}

            {isAdmin && addingPanel ? (
              <Card className="w-72 shrink-0">
                <CardContent className="p-3">
                  <Input
                    placeholder="Panel name"
                    value={newPanelName}
                    onChange={(e) => setNewPanelName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddPanel();
                      if (e.key === "Escape") setAddingPanel(false);
                    }}
                    autoFocus
                  />
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={handleAddPanel}>
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAddingPanel(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : isAdmin ? (
              <Button
                variant="outline"
                className="h-auto w-72 shrink-0 justify-start py-3"
                onClick={() => setAddingPanel(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Panel
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

interface PanelColumnProps {
  panel: Panel;
  onTaskClick: (task: Task) => void;
  onAddTask: (panelId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  editingPanelId: string | null;
  editingPanelName: string;
  setEditingPanelName: (name: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDragStart: (task: Task) => void;
  onDropTask: () => void;
  canModifyTask: (task: Task) => boolean;
  getPriorityColor: (priority: string) => string;
  showPanelActions: boolean;
  showAddTask: boolean;
  onPanelDragStart: (panelId: string) => void;
  onPanelDragEnd: () => void;
  onPanelDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onPanelDrop: () => void;
  isPanelDropTarget: boolean;
  onResize: (dimensions: { width: number; height: number }) => void;
  layout: "horizontal" | "vertical";
}

function PanelColumn({
  panel,
  onTaskClick,
  onAddTask,
  onEdit,
  onDelete,
  editingPanelId,
  editingPanelName,
  setEditingPanelName,
  onSaveEdit,
  onCancelEdit,
  onDragStart,
  onDropTask,
  canModifyTask,
  getPriorityColor,
  showPanelActions,
  showAddTask,
  onPanelDragStart,
  onPanelDragEnd,
  onPanelDragOver,
  onPanelDrop,
  isPanelDropTarget,
  onResize,
  layout,
}: PanelColumnProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const resizeStateRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  const pendingSizeRef = useRef<{ width: number; height: number } | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const [draftSize, setDraftSize] = useState<{ width: number; height: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isSavingSize, setIsSavingSize] = useState(false);

  const currentHeight = draftSize?.height ?? panel.height ?? 520;
  const horizontalMinWidth = "calc((100% - 3rem) / 4)";
  const horizontalMaxWidth = "calc((100% - 1rem) / 2)";
  const horizontalBaseWidth = draftSize?.width ?? panel.width;
  const horizontalWidthValue = horizontalBaseWidth ? `${Math.round(horizontalBaseWidth)}px` : horizontalMinWidth;

  useEffect(() => {
    if (!isResizing && !isSavingSize && draftSize) {
      const widthMatches = Math.round(panel.width ?? 320) === Math.round(draftSize.width);
      const heightMatches = Math.round(panel.height ?? 520) === Math.round(draftSize.height);
      if (widthMatches && heightMatches) {
        setDraftSize(null);
      }
    }
  }, [panel.width, panel.height, isResizing, isSavingSize, draftSize]);

  const clampMin = (value: number, min: number) => Math.max(value, min);

  const startResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!showPanelActions || layout !== "horizontal" || !panelRef.current) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = panelRef.current.getBoundingClientRect();
    const railWidth = panelRef.current.parentElement?.parentElement?.clientWidth || rect.width * 4;
    const minResizeWidth = Math.max(Math.floor((railWidth - 48) / 4), 240);
    const maxResizeWidth = Math.max(Math.floor((railWidth - 16) / 2), minResizeWidth);
    resizeStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
    };
    setIsResizing(true);

    const handleMove = (moveEvent: PointerEvent) => {
      const state = resizeStateRef.current;
      if (!state) return;

      const nextWidth = clampMin(
        Math.min(state.startWidth + (moveEvent.clientX - state.startX), maxResizeWidth),
        minResizeWidth
      );
      const nextHeight = clampMin(state.startHeight + (moveEvent.clientY - state.startY), 320);
      pendingSizeRef.current = { width: Math.round(nextWidth), height: Math.round(nextHeight) };

      if (resizeFrameRef.current !== null) return;
      resizeFrameRef.current = window.requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        if (pendingSizeRef.current) {
          setDraftSize(pendingSizeRef.current);
        }
      });
    };

    const handleUp = () => {
      const finalSize = pendingSizeRef.current || {
        width: Math.round(resizeStateRef.current?.startWidth || panel.width || 320),
        height: Math.round(resizeStateRef.current?.startHeight || panel.height || 520),
      };

      resizeStateRef.current = null;
      pendingSizeRef.current = null;
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
      setIsResizing(false);
      setIsSavingSize(true);
      setDraftSize(finalSize);
      Promise.resolve(onResize(finalSize))
        .catch(() => {
          // Keep the visual size even if persistence fails; the toast/error path handles feedback.
        })
        .finally(() => {
          setIsSavingSize(false);
        });

      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  };

  return (
      <Card
      ref={panelRef}
      className={`group relative shrink-0 bg-muted/30 text-[0.9em] ${layout === "horizontal" ? "snap-start" : ""} ${
        isResizing || isSavingSize
          ? "transition-none"
          : "transition-[width,height,transform,box-shadow] duration-200 ease-out"
      } ${
        isPanelDropTarget ? "ring-2 ring-primary/60 ring-offset-2" : ""
      } ${draggedPanelStyle(showPanelActions)}`}
      style={{
        width:
          layout === "horizontal"
            ? `clamp(${horizontalMinWidth}, ${horizontalWidthValue}, ${horizontalMaxWidth})`
            : "100%",
        height: currentHeight,
        minWidth: layout === "horizontal" ? horizontalMinWidth : 240,
        maxWidth: layout === "horizontal" ? horizontalMaxWidth : "100%",
        minHeight: 320,
        flex: layout === "horizontal" ? "0 0 auto" : "0 0 auto",
        willChange: isResizing ? "width, height" : undefined,
      }}
      onDragOver={(event) => {
        event.preventDefault();
        onPanelDragOver(event);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onPanelDrop();
        onDropTask();
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        onPanelDragOver(event);
      }}
    >
      <CardHeader
        className="relative p-3 pb-2"
        title={showPanelActions ? "Grab the dotted handle to reorder" : undefined}
      >
        {showPanelActions ? (
          <button
            type="button"
            className="absolute left-1/2 top-2 z-10 flex h-5 w-14 -translate-x-1/2 items-center justify-center gap-1 rounded-full border border-border/70 bg-background/90 text-muted-foreground opacity-90 shadow-sm transition hover:bg-muted/70 hover:text-foreground"
            draggable={showPanelActions}
            onDragStart={(event) => {
              if (!showPanelActions) return;
              event.dataTransfer.effectAllowed = "move";
              onPanelDragStart(panel.id);
            }}
            onDragEnd={onPanelDragEnd}
            aria-label="Drag panel"
            title="Drag panel"
          >
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
          </button>
        ) : null}

        <div className="flex items-center gap-2">
          {editingPanelId === panel.id ? (
            <Input
              value={editingPanelName}
              onChange={(e) => setEditingPanelName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              autoFocus
              className="h-7"
            />
          ) : (
            <CardTitle className="flex min-w-0 items-center gap-2 text-[0.8rem] font-medium">
              <span className="truncate">{panel.name}</span>
              <Badge variant="secondary" className="text-[0.68rem]">
                {panel.tasks.length}
              </Badge>
            </CardTitle>
          )}
          <div className="ml-auto flex items-center gap-1">
            {showPanelActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>Rename</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 p-2">
        {panel.tasks
          .sort((a, b) => a.order - b.order)
          .map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onDragStart={() => onDragStart(task)}
              canModifyTask={canModifyTask(task)}
              getPriorityColor={getPriorityColor}
            />
          ))}
        {showAddTask && (
          <Button
            variant="ghost"
            className="w-full justify-start text-[0.85rem] text-muted-foreground"
            onClick={() => onAddTask(panel.id)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        )}
      </CardContent>

      {showPanelActions && layout === "horizontal" && (
        <button
          type="button"
          onPointerDown={startResize}
          className="absolute bottom-1 right-1 h-5 w-5 cursor-nwse-resize rounded-md border border-border/60 bg-background/90 opacity-80 shadow-sm transition hover:opacity-100"
          aria-label="Resize panel"
          title="Drag to resize"
        >
          <div className="absolute bottom-1 right-1 h-1.5 w-1.5 border-r-2 border-t-2 border-muted-foreground" />
        </button>
      )}
    </Card>
  );
}

function draggedPanelStyle(showPanelActions: boolean) {
  return showPanelActions ? "hover:shadow-lg" : "hover:shadow-md";
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onDragStart: () => void;
  canModifyTask: boolean;
  getPriorityColor: (priority: string) => string;
}

function TaskCard({ task, onClick, onDragStart, canModifyTask, getPriorityColor }: TaskCardProps) {
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const isOverdue = task.dueDate && isPast(parseISO(task.dueDate)) && task.status !== "done";
  const canDrag = canModifyTask;

  return (
    <Card
      className={`border-l-4 transition-shadow duration-150 hover:shadow-md ${
        canDrag ? "cursor-pointer" : "cursor-not-allowed opacity-80"
      } ${getPriorityColor(task.priority)}`}
      onClick={onClick}
      draggable={canDrag}
      onDragStart={canDrag ? onDragStart : undefined}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 space-y-2">
            <p className="font-medium leading-tight">{task.title}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {task.dueDate && (
                <span
                  className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : ""}`}
                >
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(task.dueDate), "MMM d")}
                </span>
              )}
              {task.comments.length > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {task.comments.length}
                </span>
              )}
              {task.attachments.length > 0 && (
                <span className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  {task.attachments.length}
                </span>
              )}
              {task.subtasks.length > 0 && (
                <span className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" />
                  {completedSubtasks}/{task.subtasks.length}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs capitalize">
                {task.priority}
              </Badge>
              {task.assignee && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {task.assignee.firstName.charAt(0)}
                  {task.assignee.lastName.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
