"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const [overviewMode, setOverviewMode] = useState(false);
  const [hoveredOverviewPanelId, setHoveredOverviewPanelId] = useState<string | null>(null);
  const [addingPanel, setAddingPanel] = useState(false);
  const [newPanelName, setNewPanelName] = useState("");
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);
  const [editingPanelName, setEditingPanelName] = useState("");
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [draggedPanelId, setDraggedPanelId] = useState<string | null>(null);
  const [panelDropTargetId, setPanelDropTargetId] = useState<string | null>(null);
  const [panelOrder, setPanelOrder] = useState<string[]>([]);
  const [panelScrollNode, setPanelScrollNode] = useState<HTMLDivElement | null>(null);
  const [overviewTogglePulse, setOverviewTogglePulse] = useState(false);
  const [overviewTransitionState, setOverviewTransitionState] = useState<"idle" | "enter" | "exit">("idle");
  const panelItemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const scrollIdleTimerRef = useRef<number | null>(null);
  const overviewHoverTimerRef = useRef<number | null>(null);
  const overviewTogglePulseTimerRef = useRef<number | null>(null);
  const overviewToggleDelayTimerRef = useRef<number | null>(null);
  const overviewTransitionTimerRef = useRef<number | null>(null);
  const panelScrollKey = `zentrixa:panel-scroll:${project.id}:${panelLayout}`;

  useEffect(() => {
    setPanelOrder([...project.panels].sort((a, b) => a.order - b.order).map((panel) => panel.id));
  }, [project.id, project.panels]);

  useLayoutEffect(() => {
    const el = panelScrollNode;
    if (!el || typeof window === "undefined") return;

    const raw = window.localStorage.getItem(panelScrollKey);
    if (!raw) return;

    const [leftRaw, topRaw] = raw.split(":");
    const left = Number(leftRaw);
    const top = Number(topRaw);

    window.requestAnimationFrame(() => {
      el.scrollTo({
        left: Number.isNaN(left) ? 0 : left,
        top: Number.isNaN(top) ? 0 : top,
        behavior: "auto",
      });
    });
  }, [panelLayout, panelScrollKey, panelScrollNode]);

  useEffect(() => {
    const el = panelScrollNode;
    if (!el || typeof window === "undefined") return;

    const persist = () => {
      if (scrollIdleTimerRef.current !== null) {
        window.clearTimeout(scrollIdleTimerRef.current);
      }

      scrollIdleTimerRef.current = window.setTimeout(() => {
        window.localStorage.setItem(panelScrollKey, `${el.scrollLeft}:${el.scrollTop}`);
      }, 160);
    };

    persist();
    el.addEventListener("scroll", persist, { passive: true });

    return () => {
      el.removeEventListener("scroll", persist);
      if (scrollIdleTimerRef.current !== null) {
        window.clearTimeout(scrollIdleTimerRef.current);
        scrollIdleTimerRef.current = null;
      }
      window.localStorage.setItem(panelScrollKey, `${el.scrollLeft}:${el.scrollTop}`);
    };
  }, [panelLayout, panelScrollKey, panelScrollNode]);

  const panelMap = new Map(project.panels.map((panel) => [panel.id, panel] as const));
  const sortedPanels = panelOrder.length
    ? panelOrder.map((panelId) => panelMap.get(panelId)).filter((panel): panel is Panel => Boolean(panel))
    : [...project.panels].sort((a, b) => a.order - b.order);
  const overviewPanelHeight =
    panelLayout === "horizontal" && overviewMode
      ? Math.max(...sortedPanels.map((panel) => panel.height ?? 364), 260)
      : null;

  useEffect(() => {
    if (panelLayout === "vertical" && overviewMode) {
      setOverviewMode(false);
    }
  }, [overviewMode, panelLayout]);

  useEffect(() => {
    return () => {
      if (overviewHoverTimerRef.current !== null) {
        window.clearTimeout(overviewHoverTimerRef.current);
      }
      if (overviewTogglePulseTimerRef.current !== null) {
        window.clearTimeout(overviewTogglePulseTimerRef.current);
      }
      if (overviewToggleDelayTimerRef.current !== null) {
        window.clearTimeout(overviewToggleDelayTimerRef.current);
      }
      if (overviewTransitionTimerRef.current !== null) {
        window.clearTimeout(overviewTransitionTimerRef.current);
      }
    };
  }, []);

  const canModifyTask = (task: Task) => Boolean(user && task);

  const getPanelNode = (panelId: string) => panelItemRefs.current.get(panelId) || null;

  const scrollToPanel = (panelId: string, behavior: ScrollBehavior = "smooth") => {
    const container = panelScrollNode;
    const target = getPanelNode(panelId);
    if (!container || !target) return;

    const nextLeft = Math.max(
      0,
      target.offsetLeft - (container.clientWidth - target.offsetWidth) / 2
    );

    container.scrollTo({
      left: nextLeft,
      top: container.scrollTop,
      behavior,
    });

    window.localStorage.setItem(panelScrollKey, `${nextLeft}:${container.scrollTop}`);
  };

  const getCurrentPanelIndex = () => {
    const container = panelScrollNode;
    if (!container || sortedPanels.length === 0) return 0;

    const centerX = container.scrollLeft + container.clientWidth / 2;
    let closestIndex = 0;
    let smallestDistance = Number.POSITIVE_INFINITY;

    sortedPanels.forEach((panel, index) => {
      const node = getPanelNode(panel.id);
      if (!node) return;
      const nodeCenter = node.offsetLeft + node.offsetWidth / 2;
      const distance = Math.abs(nodeCenter - centerX);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  };

  const scrollByPanel = (direction: -1 | 1) => {
    const currentIndex = getCurrentPanelIndex();
    const nextIndex = Math.min(sortedPanels.length - 1, Math.max(0, currentIndex + direction));
    const nextPanel = sortedPanels[nextIndex];
    if (!nextPanel) return;
    scrollToPanel(nextPanel.id);
  };

  useEffect(() => {
    const handleKeyboardScroll = (event: KeyboardEvent) => {
      if (panelLayout !== "horizontal" || !panelScrollNode) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollByPanel(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollByPanel(1);
      }
    };

    window.addEventListener("keydown", handleKeyboardScroll);
    return () => window.removeEventListener("keydown", handleKeyboardScroll);
  }, [panelLayout, panelScrollNode, sortedPanels]);

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
        return "border-l-amber-700";
    }
  };

  const isCompactOverview = panelLayout === "horizontal" && overviewMode;
  const exitOverview = () => setOverviewMode(false);

  const toggleOverviewMode = () => {
    if (overviewToggleDelayTimerRef.current !== null) {
      window.clearTimeout(overviewToggleDelayTimerRef.current);
      overviewToggleDelayTimerRef.current = null;
    }

    setHoveredOverviewPanelId(null);
    setOverviewTogglePulse(true);

    if (overviewTogglePulseTimerRef.current !== null) {
      window.clearTimeout(overviewTogglePulseTimerRef.current);
    }
    if (overviewTransitionTimerRef.current !== null) {
      window.clearTimeout(overviewTransitionTimerRef.current);
    }

    overviewTogglePulseTimerRef.current = window.setTimeout(() => {
      setOverviewTogglePulse(false);
      overviewTogglePulseTimerRef.current = null;
    }, 420);

    overviewToggleDelayTimerRef.current = window.setTimeout(() => {
      setOverviewMode((current) => {
        setOverviewTransitionState(current ? "exit" : "enter");
        return !current;
      });

      overviewTransitionTimerRef.current = window.setTimeout(() => {
        setOverviewTransitionState("idle");
        overviewTransitionTimerRef.current = null;
      }, 980);

      overviewToggleDelayTimerRef.current = null;
    }, 220);
  };

  const handleOverviewHoverChange = (panelId: string | null) => {
    if (overviewHoverTimerRef.current !== null) {
      window.clearTimeout(overviewHoverTimerRef.current);
      overviewHoverTimerRef.current = null;
    }

    overviewHoverTimerRef.current = window.setTimeout(() => {
      setHoveredOverviewPanelId(panelId);
      overviewHoverTimerRef.current = null;
    }, panelId ? 235 : 415);
  };

  useEffect(() => {
    if (!overviewMode) {
      setHoveredOverviewPanelId(null);
    }
  }, [overviewMode]);

  return (
    <div className="max-w-full space-y-3 overflow-hidden">
      <div className="relative flex flex-wrap items-center gap-2">
        {panelLayout === "horizontal" && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => scrollByPanel(-1)}
              className="rounded-full"
              title="Scroll left one panel"
            >
              ←
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => scrollByPanel(1)}
              className="rounded-full"
              title="Scroll right one panel"
            >
              →
            </Button>
          </div>
        )}
        {panelLayout === "horizontal" && (
          <Button
            type="button"
            variant={overviewMode ? "default" : "outline"}
            size="sm"
            onClick={toggleOverviewMode}
            aria-pressed={overviewMode}
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm transition-[transform,background-color,color,border-color,box-shadow,opacity] duration-1000 ease-[cubic-bezier(0.12,0.86,0.18,1)] motion-safe:hover:scale-[1.04] motion-safe:hover:shadow-md motion-safe:active:scale-[0.98] ${
              overviewTogglePulse ? "scale-[1.03] shadow-md ring-2 ring-primary/20" : ""
            }`}
            title={overviewMode ? "Exit overview mode" : "Enter overview mode"}
          >
            {overviewMode ? "Exit Overview" : "Overview"}
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
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
      </div>

      {panelLayout === "horizontal" ? (
        <div
          className="w-full min-w-0 max-w-full overflow-hidden"
          onClick={(event) => {
            if (!isCompactOverview || event.target !== event.currentTarget) return;
            exitOverview();
          }}
        >
          <div
            ref={setPanelScrollNode}
            className={`w-full min-w-0 overflow-x-auto overflow-y-hidden pb-2 [scrollbar-gutter:stable_both-edges] [scroll-snap-type:x_mandatory] scroll-smooth ${
              overviewMode ? "pt-0" : ""
            }`}
          >
          <div className={`flex w-max min-w-full items-start pr-0 ${overviewMode ? "gap-[2px]" : "gap-4"}`}>
              {sortedPanels.map((panel) => (
              <PanelColumn
                key={panel.id}
                panelRef={(node) => {
                  panelItemRefs.current.set(panel.id, node);
                }}
                  panel={panel}
                  layout={panelLayout}
                  overviewMode={overviewMode}
                  overviewTransitionState={overviewTransitionState}
                  onTaskClick={onTaskClick}
                  onAddTask={onAddTask}
                  overviewPanelHeight={overviewPanelHeight}
                  hoveredOverviewPanelId={hoveredOverviewPanelId}
                  onOverviewHoverChange={handleOverviewHoverChange}
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
                  onOverviewFocus={() => {
                    if (!overviewMode) return;
                    setHoveredOverviewPanelId(panel.id);
                    window.requestAnimationFrame(() => {
                      window.requestAnimationFrame(() => {
                        scrollToPanel(panel.id);
                      });
                    });
                  }}
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
        <div ref={setPanelScrollNode} className="brown-scrollbar h-[72vh] w-full overflow-y-auto overflow-x-hidden pr-1">
          <div className="flex flex-col items-stretch gap-4 pb-4">
            {sortedPanels.map((panel) => (
              <PanelColumn
                key={panel.id}
                panelRef={(node) => {
                  panelItemRefs.current.set(panel.id, node);
                }}
                panel={panel}
                layout={panelLayout}
                overviewMode={false}
                overviewTransitionState={overviewTransitionState}
                onTaskClick={onTaskClick}
                onAddTask={onAddTask}
                overviewPanelHeight={overviewPanelHeight}
                hoveredOverviewPanelId={hoveredOverviewPanelId}
                onOverviewHoverChange={handleOverviewHoverChange}
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
                onOverviewFocus={() => {}}
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
  panelRef: (node: HTMLDivElement | null) => void;
  panel: Panel;
  overviewMode: boolean;
  overviewTransitionState: "idle" | "enter" | "exit";
  overviewPanelHeight: number | null;
  hoveredOverviewPanelId: string | null;
  onOverviewHoverChange: (panelId: string | null) => void;
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
  onOverviewFocus: () => void;
  onResize: (dimensions: { width: number; height: number }) => void;
  layout: "horizontal" | "vertical";
}

function PanelColumn({
  panelRef,
  panel,
  overviewMode,
  overviewTransitionState,
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
  onOverviewFocus,
  onResize,
  layout,
  overviewPanelHeight,
  hoveredOverviewPanelId,
  onOverviewHoverChange,
}: PanelColumnProps) {
  const panelCardRef = useRef<HTMLDivElement | null>(null);
  const isCompactOverview = overviewMode && layout === "horizontal";
  const isOverviewEntering = overviewTransitionState === "enter";
  const isOverviewExpanded = isCompactOverview && hoveredOverviewPanelId === panel.id;
  const overviewPanelScale = isCompactOverview ? "shadow-2xl" : "";
  const commonOverviewHeight = overviewPanelHeight ?? Math.max(panel.height ?? 364, 260);
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

    const currentHeight = draftSize?.height ?? panel.height ?? 364;
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
    if (!showPanelActions || layout !== "horizontal" || !panelCardRef.current) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = panelCardRef.current.getBoundingClientRect();
    const railWidth = panelCardRef.current.parentElement?.parentElement?.clientWidth || rect.width * 4;
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
      ref={(node) => {
        panelCardRef.current = node;
        panelRef(node);
      }}
      className={`group relative flex flex-col shrink-0 overflow-hidden bg-muted/30 text-[0.9em] ${layout === "horizontal" ? "snap-start" : ""} ${
        isResizing || isSavingSize
          ? "transition-none"
          : "transform-gpu transition-[width,height,transform,box-shadow,opacity] duration-800 ease-[cubic-bezier(0.16,1,0.3,1)]"
      } ${
        isPanelDropTarget ? "ring-2 ring-primary/60 ring-offset-2" : ""
      } ${draggedPanelStyle(showPanelActions)} ${overviewPanelScale}`}
      style={{
        width:
          isOverviewExpanded
            ? "clamp(16rem, 24vw, 22rem)"
            : isCompactOverview
            ? "clamp(4.5rem, 5vw, 5.5rem)"
            : layout === "horizontal"
            ? `clamp(${horizontalMinWidth}, ${horizontalWidthValue}, ${horizontalMaxWidth})`
            : "100%",
        height: isCompactOverview ? commonOverviewHeight : currentHeight,
        minWidth: isOverviewExpanded
          ? "16rem"
          : isCompactOverview
            ? "4.5rem"
            : layout === "horizontal"
              ? horizontalMinWidth
              : 240,
        maxWidth: isOverviewExpanded
          ? "22rem"
          : isCompactOverview
            ? "5.5rem"
            : layout === "horizontal"
              ? horizontalMaxWidth
              : "100%",
        minHeight: isCompactOverview ? commonOverviewHeight : 260,
        flex: layout === "horizontal" ? "0 0 auto" : "0 0 auto",
        willChange: isResizing ? "width, height" : undefined,
      }}
      onClick={(event) => {
        if (isCompactOverview) {
          onOverviewFocus();
        }
      }}
      onPointerEnter={() => {
        if (isCompactOverview) {
          onOverviewHoverChange(panel.id);
        }
      }}
      onPointerLeave={() => {
        if (isCompactOverview) {
          onOverviewHoverChange(null);
        }
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
        className={`relative p-3 ${isOverviewExpanded ? "pb-2" : isCompactOverview ? "min-h-[11rem] pb-3" : "pb-2"}`}
        title={showPanelActions && !isCompactOverview ? "Grab the dotted handle to reorder" : undefined}
      >
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-3 text-center">
          {isCompactOverview ? (
            <span
              className={`absolute left-1/2 top-1/2 block w-full -translate-x-1/2 -translate-y-1/2 text-center text-[1.02rem] font-black leading-none tracking-[0.18em] text-foreground uppercase drop-shadow-sm transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] [writing-mode:vertical-rl] [text-orientation:mixed] rotate-180 ${
                isOverviewEntering || isCompactOverview ? "opacity-100 scale-100" : "opacity-0 scale-[0.96]"
              }`}
            >
              {panel.name}
            </span>
          ) : null}
        </div>

        {showPanelActions && !isCompactOverview ? (
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

        <div
          className={`flex items-center gap-2 transition-none ${
            isCompactOverview ? "pointer-events-none opacity-0 -translate-y-2 scale-[0.96]" : "opacity-100 translate-y-0 scale-100"
          }`}
        >
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
            <CardTitle className={`flex min-w-0 items-center gap-2 font-medium transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOverviewEntering ? "opacity-0 -translate-y-2 scale-[0.96]" : "opacity-100 translate-y-0 scale-100"} ${overviewMode ? "text-[0.95rem]" : "text-[0.8rem]"}`}>
              <span className="truncate">{panel.name}</span>
              <Badge variant="secondary" className="text-[0.68rem]">
                {panel.tasks.length}
              </Badge>
            </CardTitle>
          )}
          <div className={`ml-auto flex items-center gap-1 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOverviewEntering ? "opacity-0 translate-y-2 scale-[0.96]" : "opacity-100 translate-y-0 scale-100"}`}>
            {showPanelActions && !isCompactOverview && (
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

      {(!isCompactOverview || isOverviewExpanded || overviewMode) && (
        <CardContent
          className={`flex min-h-0 flex-1 flex-col gap-2 p-2 transition-[max-height,opacity,transform] duration-650 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isCompactOverview
              ? isOverviewExpanded
                ? "max-h-[calc(100%-4.75rem)] opacity-100 translate-y-0"
                : "max-h-0 overflow-hidden opacity-0 translate-y-2 pointer-events-none"
              : ""
          }`}
        >
          <div className="brown-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
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
          </div>
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
      )}

      {showPanelActions && layout === "horizontal" && !isCompactOverview && (
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
