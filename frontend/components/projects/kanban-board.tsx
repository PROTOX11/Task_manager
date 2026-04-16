"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-context";
import { useIsMobile } from "@/hooks/use-mobile";
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
  Search,
  GripVertical,
  MessageSquare,
  Paperclip,
  CheckSquare,
  Calendar,
  Columns3,
  Rows3,
  LayoutGrid,
  X,
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
  const isMobile = useIsMobile();
  const [panelLayout, setPanelLayout] = useState<"horizontal" | "vertical">("horizontal");
  const [overviewMode, setOverviewMode] = useState(false);
  const isOverview = overviewMode;
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  const [hoveredOverviewPanelId, setHoveredOverviewPanelId] = useState<string | null>(null);
  const [mobileExpandedPanelId, setMobileExpandedPanelId] = useState<string | null>(null);
  const [addingPanel, setAddingPanel] = useState(false);
  const [newPanelName, setNewPanelName] = useState("");
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);
  const [editingPanelName, setEditingPanelName] = useState("");
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [taskMoveTaskId, setTaskMoveTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [taskSearchOpen, setTaskSearchOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [mobileDraggedTaskId, setMobileDraggedTaskId] = useState<string | null>(null);
  const [mobileDraggedTaskPosition, setMobileDraggedTaskPosition] = useState<{ dx: number; dy: number } | null>(null);
  const [mobileDraggedTaskOrigin, setMobileDraggedTaskOrigin] = useState<{ left: number; top: number; width: number } | null>(null);
  const [mobileDragPendingTaskId, setMobileDragPendingTaskId] = useState<string | null>(null);
  const [mobileDraggedPanelId, setMobileDraggedPanelId] = useState<string | null>(null);
  const [mobileDropTarget, setMobileDropTarget] = useState<{
    panelId: string;
    taskId?: string;
    position?: "before" | "after";
  } | null>(null);
  const [mobilePanelDropTargetId, setMobilePanelDropTargetId] = useState<string | null>(null);
  const [draggedPanelId, setDraggedPanelId] = useState<string | null>(null);
  const [panelDropTargetId, setPanelDropTargetId] = useState<string | null>(null);
  const [panelOrder, setPanelOrder] = useState<string[]>([]);
  const [panelScrollNode, setPanelScrollNode] = useState<HTMLDivElement | null>(null);
  const [overviewTransitionState, setOverviewTransitionState] = useState<"idle" | "enter" | "exit">("idle");
  const panelItemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const taskItemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const overviewFlipRef = useRef<{
    panelId: string;
    rects: Map<string, DOMRect>;
  } | null>(null);
  const activePanelResetTimerRef = useRef<number | null>(null);
  const scrollIdleTimerRef = useRef<number | null>(null);
  const overviewHoverTimerRef = useRef<number | null>(null);
  const mobileDragTimerRef = useRef<number | null>(null);
  const mobilePanelDragTimerRef = useRef<number | null>(null);
  const mobileDragPointerRef = useRef<{
    pointerId: number;
    taskId: string;
    panelId: string;
    startX: number;
    startY: number;
  } | null>(null);
  const mobilePanelDragPointerRef = useRef<{
    pointerId: number;
    panelId: string;
    startX: number;
    startY: number;
  } | null>(null);
  const [suppressTaskClick, setSuppressTaskClick] = useState(false);
  const taskSearchButtonRef = useRef<HTMLButtonElement | null>(null);
  const taskSearchInputRef = useRef<HTMLInputElement | null>(null);
  const taskSearchDropdownRef = useRef<HTMLDivElement | null>(null);
  const searchHighlightTimerRef = useRef<number | null>(null);
  const panelScrollKey = `zentrixa:panel-scroll:${project.id}:${panelLayout}`;
  const mobileDraggedTaskIdRef = useRef<string | null>(null);
  const mobileDraggedPanelIdRef = useRef<string | null>(null);
  const panelOrderRef = useRef<string[]>(panelOrder);
  const panelScrollNodeRef = useRef<HTMLDivElement | null>(null);
  const commitMobileTaskDropRef = useRef<((taskId: string, target: { panelId: string; taskId?: string; position?: "before" | "after" }) => Promise<void>) | null>(null);
  const reorderPanelsRef = useRef(reorderPanels);
  const projectIdRef = useRef(project.id);
  const projectPanelsRef = useRef(project.panels);

  useEffect(() => {
    setPanelOrder([...project.panels].sort((a, b) => a.order - b.order).map((panel) => panel.id));
  }, [project.id, project.panels]);

  useEffect(() => {
    mobileDraggedTaskIdRef.current = mobileDraggedTaskId;
  }, [mobileDraggedTaskId]);

  useEffect(() => {
    mobileDraggedPanelIdRef.current = mobileDraggedPanelId;
  }, [mobileDraggedPanelId]);

  useEffect(() => {
    panelOrderRef.current = panelOrder;
  }, [panelOrder]);

  useEffect(() => {
    panelScrollNodeRef.current = panelScrollNode;
  }, [panelScrollNode]);

  useEffect(() => {
    reorderPanelsRef.current = reorderPanels;
  }, [reorderPanels]);

  useEffect(() => {
    projectIdRef.current = project.id;
  }, [project.id]);

  useEffect(() => {
    projectPanelsRef.current = project.panels;
  }, [project.panels]);

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

  const sortedPanels = useMemo(() => {
    const panelMap = new Map(project.panels.map((panel) => [panel.id, panel] as const));
    return panelOrder.length
      ? panelOrder.map((panelId) => panelMap.get(panelId)).filter((panel): panel is Panel => Boolean(panel))
      : [...project.panels].sort((a, b) => a.order - b.order);
  }, [panelOrder, project.panels]);
  const sortedPanelSignature = sortedPanels
    .map((panel) => `${panel.id}:${panel.width ?? 0}:${panel.height ?? 0}`)
    .join("|");
  const isMobileOverview = isMobile && panelLayout === "vertical" && overviewMode;
  const overviewPanelHeight =
    panelLayout === "horizontal" && overviewMode
      ? Math.max(...sortedPanels.map((panel) => panel.height ?? 364), 260)
      : null;

  useEffect(() => {
    if (panelLayout === "vertical" && overviewMode && !isMobile) {
      setOverviewMode(false);
    }
  }, [overviewMode, panelLayout, isMobile]);

  useEffect(() => {
    if (!overviewMode) {
      setMobileExpandedPanelId(null);
    }
  }, [overviewMode]);

  useEffect(() => {
    if (!isMobileOverview) {
      setMobileExpandedPanelId(null);
    }
  }, [isMobileOverview]);

  useLayoutEffect(() => {
    const flip = overviewFlipRef.current;
    if (!flip || overviewMode || panelLayout !== "horizontal") {
      return;
    }

    const animations: Array<{
      node: HTMLDivElement;
      transition: string;
      transform: string;
      willChange: string;
      zIndex: string;
    }> = [];

    sortedPanels.forEach((panel) => {
      const node = panelItemRefs.current.get(panel.id);
      const firstRect = flip.rects.get(panel.id);
      if (!node || !firstRect) return;

      const lastRect = node.getBoundingClientRect();
      if (lastRect.width === 0 || lastRect.height === 0) return;

      const deltaX = firstRect.left - lastRect.left;
      const deltaY = firstRect.top - lastRect.top;
      const scaleX = firstRect.width / lastRect.width;
      const scaleY = firstRect.height / lastRect.height;

      animations.push({
        node,
        transition: node.style.transition,
        transform: node.style.transform,
        willChange: node.style.willChange,
        zIndex: node.style.zIndex,
      });

      node.style.transition = "none";
      node.style.willChange = "transform";
      node.style.zIndex = panel.id === flip.panelId ? "20" : "10";
      node.style.transformOrigin = "center center";
      node.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`;
      node.getBoundingClientRect();
    });

    const raf = window.requestAnimationFrame(() => {
      sortedPanels.forEach((panel) => {
        const node = panelItemRefs.current.get(panel.id);
        if (!node || !flip.rects.has(panel.id)) return;
        node.style.transition = "transform 480ms cubic-bezier(0.4, 0, 0.2, 1), opacity 480ms cubic-bezier(0.4, 0, 0.2, 1)";
        node.style.transform = "none";
      });
    });

    const cleanupTimer = window.setTimeout(() => {
      animations.forEach(({ node, transition, transform, willChange, zIndex }) => {
        node.style.transition = transition;
        node.style.transform = transform;
        node.style.willChange = willChange;
        node.style.zIndex = zIndex;
      });
      overviewFlipRef.current = null;
    }, 520);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(cleanupTimer);
      animations.forEach(({ node, transition, transform, willChange, zIndex }) => {
        node.style.transition = transition;
        node.style.transform = transform;
        node.style.willChange = willChange;
        node.style.zIndex = zIndex;
      });
    };
  }, [overviewMode, panelLayout, sortedPanelSignature]);

  useEffect(() => {
    return () => {
      if (overviewHoverTimerRef.current !== null) {
        window.clearTimeout(overviewHoverTimerRef.current);
      }
      if (activePanelResetTimerRef.current !== null) {
        window.clearTimeout(activePanelResetTimerRef.current);
      }
      if (mobileDragTimerRef.current !== null) {
        window.clearTimeout(mobileDragTimerRef.current);
      }
      if (mobilePanelDragTimerRef.current !== null) {
        window.clearTimeout(mobilePanelDragTimerRef.current);
      }
      if (searchHighlightTimerRef.current !== null) {
        window.clearTimeout(searchHighlightTimerRef.current);
      }
    };
  }, []);

  const canModifyTask = (task: Task) =>
    task.assignee?.id === user?.id || user?.role === "admin";

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

  const clearTaskMoveMode = () => {
    setTaskMoveTaskId(null);
    setPanelDropTargetId(null);
    setMobileDropTarget(null);
    setDraggedTask(null);
    setMobileDraggedTaskId(null);
    setMobileDraggedTaskPosition(null);
    setMobileDraggedTaskOrigin(null);
    setSuppressTaskClick(false);
  };

  const highlightTask = (taskId: string) => {
    setActiveTaskId(taskId);
    if (searchHighlightTimerRef.current !== null) {
      window.clearTimeout(searchHighlightTimerRef.current);
    }

    searchHighlightTimerRef.current = window.setTimeout(() => {
      setActiveTaskId((current) => (current === taskId ? null : current));
      searchHighlightTimerRef.current = null;
    }, 2200);
  };

  const focusTaskInBoard = (taskId: string, panelId: string) => {
    setActivePanelId(panelId);
    scrollToPanel(panelId);
    highlightTask(taskId);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        taskItemRefs.current.get(taskId)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    });
  };

  const handleTaskSearchSelect = (result: { task: Task; panelId: string; panelName: string }) => {
    setSearchQuery("");
    setTaskSearchOpen(false);
    focusTaskInBoard(result.task.id, result.panelId);
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
  };

  const handleUpdatePanel = async (panelId: string) => {
    if (!editingPanelName.trim()) return;
    await updatePanel(project.id, panelId, { name: editingPanelName });
    setEditingPanelId(null);
    setEditingPanelName("");
  };

  const handleDeletePanel = async (panelId: string) => {
    await deletePanel(project.id, panelId);
  };

  const handleTaskDragStart = (task: Task) => {
    setDraggedTask(task);
    setDraggedPanelId(null);
    setPanelDropTargetId(null);
    setTaskMoveTaskId(null);
  };

  const startTaskMoveMode = (task: Task) => {
    if (!canModifyTask(task)) return;
    setTaskMoveTaskId(task.id);
    setDraggedTask(null);
    setDraggedPanelId(null);
    setPanelDropTargetId(null);
    setMobileDropTarget(null);
    setMobileDraggedTaskId(null);
    setMobileDraggedTaskPosition(null);
    setMobileDraggedTaskOrigin(null);
    setSuppressTaskClick(true);
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
    const movingTask = taskMoveTaskId
      ? getTaskPanel(taskMoveTaskId)?.task
      : draggedTask;

    if (movingTask && movingTask.panelId !== panelId) {
      try {
        await moveTask(movingTask.id, panelId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to move task";
        toast.error(message);
      }
    }
    setDraggedTask(null);
    setPanelDropTargetId(null);
    clearTaskMoveMode();
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
    handlePanelDragEnd();
  };

  const handleTaskMoveToPanel = async (panelId: string) => {
    const movingTask = taskMoveTaskId
      ? getTaskPanel(taskMoveTaskId)?.task
      : draggedTask;

    if (!movingTask) return;

    if (movingTask.panelId !== panelId) {
      try {
        await moveTask(movingTask.id, panelId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to move task";
        toast.error(message);
      }
    }

    setDraggedTask(null);
    setPanelDropTargetId(null);
    clearTaskMoveMode();
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

  const getSortedTasksForPanel = (panelId: string) => {
    const panel = sortedPanels.find((currentPanel) => currentPanel.id === panelId);
    return [...(panel?.tasks || [])].sort((a, b) => a.order - b.order);
  };

  const computeTaskOrder = (
    targetPanelId: string,
    targetTaskId?: string,
    placement: "before" | "after" = "after",
    movingTaskId?: string
  ) => {
    const tasks = getSortedTasksForPanel(targetPanelId).filter((task) => task.id !== movingTaskId);
    if (tasks.length === 0) return 0;

    if (!targetTaskId) {
      return tasks[tasks.length - 1].order + 1;
    }

    const targetIndex = tasks.findIndex((task) => task.id === targetTaskId);
    if (targetIndex < 0) {
      return tasks[tasks.length - 1].order + 1;
    }

    if (placement === "before") {
      const prev = tasks[targetIndex - 1];
      const next = tasks[targetIndex];
      if (!prev) return next.order - 1;
      return (prev.order + next.order) / 2;
    }

    const current = tasks[targetIndex];
    const next = tasks[targetIndex + 1];
    if (!next) return current.order + 1;
    return (current.order + next.order) / 2;
  };

  const getTaskPanel = (taskId: string) => {
    for (const panel of sortedPanels) {
      const task = panel.tasks.find((currentTask) => currentTask.id === taskId);
      if (task) return { panel, task };
    }
    return null;
  };

  const resolvePointerTarget = (clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const taskNode = element?.closest("[data-task-id]") as HTMLElement | null;
    const panelNode = element?.closest("[data-panel-id]") as HTMLElement | null;

    if (taskNode?.dataset.taskId && taskNode.dataset.panelId) {
      const rect = taskNode.getBoundingClientRect();
      return {
        panelId: taskNode.dataset.panelId,
        taskId: taskNode.dataset.taskId,
        position: clientY < rect.top + rect.height / 2 ? "before" : "after",
      } as const;
    }

    if (panelNode?.dataset.panelId) {
      return { panelId: panelNode.dataset.panelId } as const;
    }

    return null;
  };

  const commitMobileTaskDrop = async (taskId: string, target: { panelId: string; taskId?: string; position?: "before" | "after" }) => {
    const source = getTaskPanel(taskId);
    if (!source) return;
    if (target.panelId === source.panel.id && target.taskId === taskId) return;

    const samePanel = source.panel.id === target.panelId;
    const targetOrder = computeTaskOrder(target.panelId, target.taskId, target.position, taskId);

    if (samePanel && source.task.order === targetOrder) {
      return;
    }

    await moveTask(taskId, target.panelId, targetOrder);
  };

  commitMobileTaskDropRef.current = commitMobileTaskDrop;

  const startMobileTaskDrag = (task: Task, panelId: string, event: ReactPointerEvent<HTMLElement>) => {
    if (!isMobile || panelLayout !== "horizontal" || event.pointerType === "mouse") return;
    if (!canModifyTask(task)) return;

    event.preventDefault();
    event.stopPropagation();

    setMobileDragPendingTaskId(task.id);

    mobileDragPointerRef.current = {
      pointerId: event.pointerId,
      taskId: task.id,
      panelId,
      startX: event.clientX,
      startY: event.clientY,
    };

    if (mobileDragTimerRef.current !== null) {
      window.clearTimeout(mobileDragTimerRef.current);
    }

    mobileDragTimerRef.current = window.setTimeout(() => {
      const taskNode = taskItemRefs.current.get(task.id);
      const rect = taskNode?.getBoundingClientRect();
      setMobileDraggedTaskId(task.id);
      setMobileDraggedTaskPosition({ dx: event.clientX, dy: event.clientY });
      setMobileDraggedTaskOrigin(
        rect
          ? {
              left: rect.left,
              top: rect.top,
              width: rect.width,
            }
          : null
      );
      setPanelDropTargetId(panelId);
      setSuppressTaskClick(true);
      setMobileDragPendingTaskId(null);
      mobileDragTimerRef.current = null;
    }, 150);
  };

  const startMobilePanelDrag = (panelId: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!isMobile || panelLayout !== "horizontal" || event.pointerType === "mouse") return;
    if (!isAdmin) return;

    event.preventDefault();
    event.stopPropagation();

    mobilePanelDragPointerRef.current = {
      pointerId: event.pointerId,
      panelId,
      startX: event.clientX,
      startY: event.clientY,
    };

    if (mobilePanelDragTimerRef.current !== null) {
      window.clearTimeout(mobilePanelDragTimerRef.current);
    }

    mobilePanelDragTimerRef.current = window.setTimeout(() => {
      setMobileDraggedPanelId(panelId);
      setMobilePanelDropTargetId(panelId);
      mobilePanelDragTimerRef.current = null;
    }, 150);
  };

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      const drag = mobileDragPointerRef.current;
      const panelDrag = mobilePanelDragPointerRef.current;
      if (!drag && !panelDrag) return;

      if (drag) {
        const draggedTaskId = mobileDraggedTaskIdRef.current;
        const movedDistance = Math.abs(clientX - drag.startX) + Math.abs(clientY - drag.startY);
        if (draggedTaskId !== drag.taskId) {
          if (movedDistance > 10 && mobileDragTimerRef.current !== null) {
            window.clearTimeout(mobileDragTimerRef.current);
            mobileDragTimerRef.current = null;
            mobileDragPointerRef.current = null;
          }
          return;
        }

        setMobileDraggedTaskPosition({ dx: clientX, dy: clientY });

        const container = panelScrollNodeRef.current;
        if (container) {
          const edge = window.innerWidth * 0.25;
          if (clientX < edge) container.scrollBy({ left: -32, behavior: "auto" });
          if (clientX > window.innerWidth - edge) container.scrollBy({ left: 32, behavior: "auto" });
        }

        const target = resolvePointerTarget(clientX, clientY);
        if (target) {
          setMobileDropTarget({
            panelId: target.panelId,
            taskId: target.taskId,
            position: target.position,
          });
          setPanelDropTargetId(target.panelId);
        } else {
          setMobileDropTarget(null);
          setPanelDropTargetId(null);
        }
      }

      if (panelDrag) {
        const draggedPanelId = mobileDraggedPanelIdRef.current;
        const movedDistance = Math.abs(clientX - panelDrag.startX) + Math.abs(clientY - panelDrag.startY);
        if (draggedPanelId !== panelDrag.panelId) {
          if (movedDistance > 10 && mobilePanelDragTimerRef.current !== null) {
            window.clearTimeout(mobilePanelDragTimerRef.current);
            mobilePanelDragTimerRef.current = null;
            mobilePanelDragPointerRef.current = null;
          }
          return;
        }

        const target = resolvePointerTarget(clientX, clientY);
        if (target?.panelId) {
          setMobilePanelDropTargetId(target.panelId);
          setPanelDropTargetId(target.panelId);

          setPanelOrder((currentOrder) => {
            const activeOrder = panelOrderRef.current.length
              ? panelOrderRef.current
              : [...projectPanelsRef.current].sort((a, b) => a.order - b.order).map((item) => item.id);
            const fromIndex = activeOrder.findIndex((panelId) => panelId === panelDrag.panelId);
            const toIndex = activeOrder.findIndex((panelId) => panelId === target.panelId);
            if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return activeOrder;

            const insertAfter = clientX > (panelItemRefs.current.get(target.panelId)?.getBoundingClientRect().left || 0) + (panelItemRefs.current.get(target.panelId)?.getBoundingClientRect().width || 0) / 2;
            const targetIndex = insertAfter ? toIndex + 1 : toIndex;

            const nextOrder = [...activeOrder];
            const [movingPanelId] = nextOrder.splice(fromIndex, 1);
            const adjustedTargetIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
            nextOrder.splice(adjustedTargetIndex, 0, movingPanelId);
            return nextOrder;
          });
        } else {
          setMobilePanelDropTargetId(null);
          setPanelDropTargetId(null);
        }
      }
    };

    const finishDrag = async (clientX: number, clientY: number) => {
      const drag = mobileDragPointerRef.current;
      const panelDrag = mobilePanelDragPointerRef.current;
      if (!drag && !panelDrag) return;

      if (mobileDragTimerRef.current !== null) {
        window.clearTimeout(mobileDragTimerRef.current);
        mobileDragTimerRef.current = null;
      }
      if (mobilePanelDragTimerRef.current !== null) {
        window.clearTimeout(mobilePanelDragTimerRef.current);
        mobilePanelDragTimerRef.current = null;
      }

      mobileDragPointerRef.current = null;
      mobilePanelDragPointerRef.current = null;
      setMobileDragPendingTaskId(null);
      setMobileDropTarget(null);
      setPanelDropTargetId(null);
      setMobileDraggedTaskId(null);
      setMobileDraggedTaskPosition(null);
      setMobileDraggedTaskOrigin(null);
      setMobileDraggedPanelId(null);
      setMobilePanelDropTargetId(null);

      if (drag) {
        const draggedTaskId = mobileDraggedTaskIdRef.current;
        if (draggedTaskId !== drag.taskId) {
          const movedDistance = Math.abs(clientX - drag.startX) + Math.abs(clientY - drag.startY);
          if (movedDistance <= 10) {
            setTaskMoveTaskId(drag.taskId);
            setPanelDropTargetId(drag.panelId);
            setSuppressTaskClick(true);
            return;
          }
        }

        const isDragging = draggedTaskId === drag.taskId;
        const target = resolvePointerTarget(clientX, clientY);

        if (!isDragging || !target) {
          window.setTimeout(() => setSuppressTaskClick(false), 0);
          return;
        }

        try {
          if (commitMobileTaskDropRef.current) {
            await commitMobileTaskDropRef.current(drag.taskId, target);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to move task";
          toast.error(message);
        } finally {
          window.setTimeout(() => {
            setSuppressTaskClick(false);
          }, 0);
        }
      }

      if (panelDrag) {
        const target = resolvePointerTarget(clientX, clientY);
        if (target?.panelId && target.panelId !== panelDrag.panelId) {
          try {
            const currentOrder = panelOrderRef.current.length
              ? panelOrderRef.current
              : [...projectPanelsRef.current].sort((a, b) => a.order - b.order).map((item) => item.id);
            const fromIndex = currentOrder.findIndex((panelId) => panelId === panelDrag.panelId);
            const toIndex = currentOrder.findIndex((panelId) => panelId === target.panelId);
            if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
              const nextOrder = [...currentOrder];
              const [movingPanelId] = nextOrder.splice(fromIndex, 1);
              const targetIndex = clientX > (panelItemRefs.current.get(target.panelId)?.getBoundingClientRect().left || 0) + (panelItemRefs.current.get(target.panelId)?.getBoundingClientRect().width || 0) / 2
                ? toIndex + 1
                : toIndex;
              const adjustedTargetIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
              nextOrder.splice(adjustedTargetIndex, 0, movingPanelId);
              await reorderPanelsRef.current(projectIdRef.current, nextOrder);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to reorder panels";
            toast.error(message);
          }
        }
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      handleMove(event.clientX, event.clientY);
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      if (mobileDragPointerRef.current || mobilePanelDragPointerRef.current) {
        event.preventDefault();
      }
      handleMove(touch.clientX, touch.clientY);
    };

    const handlePointerUp = (event: PointerEvent) => {
      void finishDrag(event.clientX, event.clientY);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      void finishDrag(touch.clientX, touch.clientY);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  const isCompactOverview = panelLayout === "horizontal" && isOverview;
  const exitOverview = () => setOverviewMode(false);

  const toggleOverviewMode = () => {
    setHoveredOverviewPanelId(null);
    setOverviewTransitionState("idle");
    if (activePanelResetTimerRef.current !== null) {
      window.clearTimeout(activePanelResetTimerRef.current);
      activePanelResetTimerRef.current = null;
    }
    setActivePanelId(null);
    setOverviewMode((current) => !current);
  };

  const handleOverviewPanelSelect = (panelId: string) => {
    if (!overviewMode) return;

    setHoveredOverviewPanelId(panelId);
    setOverviewTransitionState("exit");
    setActivePanelId(panelId);

    if (activePanelResetTimerRef.current !== null) {
      window.clearTimeout(activePanelResetTimerRef.current);
      activePanelResetTimerRef.current = null;
    }

    const rects = new Map<string, DOMRect>();
    sortedPanels.forEach((panel) => {
      const node = panelItemRefs.current.get(panel.id);
      if (node) {
        rects.set(panel.id, node.getBoundingClientRect());
      }
    });
    overviewFlipRef.current = { panelId, rects };

    setOverviewMode(false);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scrollToPanel(panelId);
      });
    });

    activePanelResetTimerRef.current = window.setTimeout(() => {
      setActivePanelId(null);
      activePanelResetTimerRef.current = null;
      setOverviewTransitionState("idle");
    }, 520);
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

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const allResults = sortedPanels.flatMap((panel) =>
      [...panel.tasks]
        .sort((a, b) => a.order - b.order)
        .map((task) => ({
          task,
          panelId: panel.id,
          panelName: panel.name,
        }))
    );

    return query
      ? allResults.filter(({ task }) => task.title.toLowerCase().includes(query))
      : allResults.slice(0, 5);
  }, [searchQuery, sortedPanels]);

  useEffect(() => {
    if (!taskSearchOpen) return;

    const raf = window.requestAnimationFrame(() => {
      taskSearchInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(raf);
  }, [taskSearchOpen]);

  useEffect(() => {
    if (!taskSearchOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        taskSearchDropdownRef.current?.contains(target) ||
        taskSearchButtonRef.current?.contains(target)
      ) {
        return;
      }
      setTaskSearchOpen(false);
    };

    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [taskSearchOpen]);

  return (
    <div className="max-w-full space-y-3 overflow-hidden">
      <div className="relative flex flex-wrap items-center gap-2">
        {panelLayout === "horizontal" && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => scrollByPanel(-1)}
              className="h-[42px] rounded-full px-4 text-base"
              title="Scroll left one panel"
            >
              ←
            </Button>
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => scrollByPanel(1)}
              className="h-[42px] rounded-full px-4 text-base"
              title="Scroll right one panel"
            >
              →
            </Button>
          </div>
        )}
        {(panelLayout === "horizontal" || isMobile) && (
          <button
            type="button"
            onClick={toggleOverviewMode}
            aria-pressed={isOverview}
            className={`inline-flex h-[42px] w-[42px] items-center justify-center rounded-md border bg-background text-foreground shadow-xs outline-none transition-all duration-300 ease-in-out max-[767px]:h-12 max-[767px]:w-12 ${
              panelLayout === "horizontal"
                ? "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                : ""
            }`}
            title={isOverview ? "Exit overview" : "Enter overview"}
          >
            <span className="relative flex h-5 w-5 items-center justify-center">
              <LayoutGrid
                className={`absolute h-5 w-5 transition-all duration-300 ease-in-out max-[767px]:h-6 max-[767px]:w-6 ${
                  isOverview ? "rotate-90 scale-75 opacity-0" : "rotate-0 scale-100 opacity-100"
                }`}
              />
              <X
                className={`absolute h-5 w-5 transition-all duration-300 ease-in-out max-[767px]:h-6 max-[767px]:w-6 ${
                  isOverview ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-75 opacity-0"
                }`}
              />
            </span>
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() =>
              setPanelLayout((current) => (current === "horizontal" ? "vertical" : "horizontal"))
            }
            className="h-[42px] w-[42px] shrink-0 rounded-full max-[767px]:h-12 max-[767px]:w-12"
            title={panelLayout === "horizontal" ? "Switch to vertical scroll" : "Switch to horizontal scroll"}
          >
            {panelLayout === "horizontal" ? (
              <Rows3 className="h-5 w-5 max-[767px]:h-6 max-[767px]:w-6" />
            ) : (
              <Columns3 className="h-5 w-5 max-[767px]:h-6 max-[767px]:w-6" />
            )}
          </Button>
          <div className="relative">
            <Button
              type="button"
              ref={taskSearchButtonRef}
              variant="outline"
              size="default"
              className="h-[42px] gap-2 rounded-full px-4"
              onClick={() => setTaskSearchOpen((current) => !current)}
            >
              <Search className="h-5 w-5" />
              <span className="hidden sm:inline">Search</span>
            </Button>
            {taskSearchOpen && (
              <div
                ref={taskSearchDropdownRef}
                className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(22rem,90vw)] rounded-2xl border bg-background p-3 shadow-2xl"
              >
                <Input
                  ref={taskSearchInputRef}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search tasks by title"
                />
                <div className="mt-3 max-h-[250px] overflow-y-auto pr-1">
                  {searchResults.length > 0 ? (
                    <div className="space-y-2">
                      {searchResults.map((result) => (
                        <button
                          key={result.task.id}
                          type="button"
                          className={`w-full rounded-xl border px-3 py-2 text-left transition hover:bg-muted/60 ${
                            activeTaskId === result.task.id ? "border-primary bg-primary/5" : "border-border"
                          }`}
                          onClick={() => handleTaskSearchSelect(result)}
                        >
                          <p className="truncate text-sm font-medium">{result.task.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{result.panelName}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No tasks found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className={`panels flex w-max min-w-full items-start pr-0 transition-[gap] duration-500 ease-in-out ${overviewMode ? "gap-[2px]" : "gap-4"} ${isMobile ? "touch-pan-x" : ""}`}>
              {sortedPanels.map((panel) => (
              <PanelColumn
                key={panel.id}
                panelRef={(node) => {
                  panelItemRefs.current.set(panel.id, node);
                }}
                panel={panel}
                layout={panelLayout}
                overviewMode={overviewMode}
                activePanelId={activePanelId}
                overviewTransitionState={overviewTransitionState}
                isMobileView={isMobile}
                isMobileOverview={isMobileOverview}
                mobileExpandedPanelId={mobileExpandedPanelId}
                onTaskClick={onTaskClick}
                onAddTask={onAddTask}
                overviewPanelHeight={overviewPanelHeight}
                hoveredOverviewPanelId={hoveredOverviewPanelId}
                onOverviewHoverChange={handleOverviewHoverChange}
                mobileDraggedTaskId={mobileDraggedTaskId}
                mobileDraggedTaskPosition={mobileDraggedTaskPosition}
                mobileDraggedTaskOrigin={mobileDraggedTaskOrigin}
                mobileDropTarget={mobileDropTarget}
                mobileDragPendingTaskId={mobileDragPendingTaskId}
                suppressTaskClick={suppressTaskClick}
                onMobileTaskPointerDown={startMobileTaskDrag}
                taskMoveModeTaskId={taskMoveTaskId}
                onMoveTaskToPanel={handleTaskMoveToPanel}
                activeTaskId={activeTaskId}
                onTaskHandleClick={startTaskMoveMode}
                taskItemRefs={taskItemRefs}
                onMobileOverviewToggle={(panelId) => {
                  if (!isMobileOverview) return;
                  setMobileExpandedPanelId((current) => (current === panelId ? null : panelId));
                  window.requestAnimationFrame(() => {
                    const node = panelItemRefs.current.get(panelId);
                    node?.scrollIntoView({ behavior: "smooth", block: "center" });
                  });
                }}
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
                onOverviewPanelSelect={handleOverviewPanelSelect}
                onMobilePanelPointerDown={startMobilePanelDrag}
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
                  className="h-auto w-72 shrink-0 justify-start py-3 max-[767px]:w-[80%] max-[767px]:py-4 max-[767px]:text-[1rem]"
                  onClick={() => setAddingPanel(true)}
                >
                  <Plus className="mr-2 h-4 w-4 max-[767px]:h-5 max-[767px]:w-5" />
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
                overviewMode={overviewMode}
                activePanelId={activePanelId}
                overviewTransitionState={overviewTransitionState}
                isMobileView={isMobile}
                isMobileOverview={isMobileOverview}
                mobileExpandedPanelId={mobileExpandedPanelId}
                onTaskClick={onTaskClick}
                onAddTask={onAddTask}
                overviewPanelHeight={overviewPanelHeight}
                hoveredOverviewPanelId={hoveredOverviewPanelId}
                onOverviewHoverChange={handleOverviewHoverChange}
                mobileDraggedTaskId={mobileDraggedTaskId}
                mobileDraggedTaskPosition={mobileDraggedTaskPosition}
                mobileDraggedTaskOrigin={mobileDraggedTaskOrigin}
                mobileDropTarget={mobileDropTarget}
                mobileDragPendingTaskId={mobileDragPendingTaskId}
                suppressTaskClick={suppressTaskClick}
                onMobileTaskPointerDown={startMobileTaskDrag}
                taskMoveModeTaskId={taskMoveTaskId}
                onMoveTaskToPanel={handleTaskMoveToPanel}
                activeTaskId={activeTaskId}
                onTaskHandleClick={startTaskMoveMode}
                taskItemRefs={taskItemRefs}
                onMobileOverviewToggle={(panelId) => {
                  if (!isMobileOverview) return;
                  setMobileExpandedPanelId((current) => (current === panelId ? null : panelId));
                  window.requestAnimationFrame(() => {
                    const node = panelItemRefs.current.get(panelId);
                    node?.scrollIntoView({ behavior: "smooth", block: "center" });
                  });
                }}
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
                onOverviewPanelSelect={handleOverviewPanelSelect}
                onMobilePanelPointerDown={startMobilePanelDrag}
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
                className="h-auto w-72 shrink-0 justify-start py-3 max-[767px]:w-[80%] max-[767px]:py-4 max-[767px]:text-[1rem]"
                onClick={() => setAddingPanel(true)}
              >
                <Plus className="mr-2 h-4 w-4 max-[767px]:h-5 max-[767px]:w-5" />
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
  activePanelId: string | null;
  overviewTransitionState: "idle" | "enter" | "exit";
  overviewPanelHeight: number | null;
  hoveredOverviewPanelId: string | null;
  onOverviewHoverChange: (panelId: string | null) => void;
  isMobileView: boolean;
  isMobileOverview: boolean;
  mobileExpandedPanelId: string | null;
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
  onPanelDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
  onPanelDrop: () => void;
  isPanelDropTarget: boolean;
  onOverviewPanelSelect: (panelId: string) => void;
  onMobilePanelPointerDown: (panelId: string, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onMobileOverviewToggle: (panelId: string) => void;
  mobileDraggedTaskId: string | null;
  mobileDraggedTaskPosition: { dx: number; dy: number } | null;
  mobileDraggedTaskOrigin: { left: number; top: number; width: number } | null;
  mobileDropTarget: { panelId: string; taskId?: string; position?: "before" | "after" } | null;
  mobileDragPendingTaskId: string | null;
  suppressTaskClick: boolean;
  onMobileTaskPointerDown: (task: Task, panelId: string, event: ReactPointerEvent<HTMLElement>) => void;
  taskMoveModeTaskId: string | null;
  onMoveTaskToPanel: (panelId: string) => void;
  activeTaskId: string | null;
  onTaskHandleClick: (task: Task) => void;
  taskItemRefs: RefObject<Map<string, HTMLDivElement | null>>;
  onResize: (dimensions: { width: number; height: number }) => void;
  layout: "horizontal" | "vertical";
}

function PanelColumn({
  panelRef,
  panel,
  overviewMode,
  activePanelId,
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
  onOverviewPanelSelect,
  onMobilePanelPointerDown,
  onResize,
  layout,
  overviewPanelHeight,
  hoveredOverviewPanelId,
  onOverviewHoverChange,
  isMobileView,
  isMobileOverview,
  mobileExpandedPanelId,
  onMobileOverviewToggle,
  mobileDraggedTaskId,
  mobileDraggedTaskPosition,
  mobileDraggedTaskOrigin,
  mobileDropTarget,
  mobileDragPendingTaskId,
  suppressTaskClick,
  onMobileTaskPointerDown,
  taskMoveModeTaskId,
  onMoveTaskToPanel,
  activeTaskId,
  onTaskHandleClick,
  taskItemRefs,
}: PanelColumnProps) {
  const panelCardRef = useRef<HTMLDivElement | null>(null);
  const isCompactOverview = overviewMode && layout === "horizontal";
  const isMobileOverviewExpanded = isMobileOverview && mobileExpandedPanelId === panel.id;
  const isOverviewExpanded = (isCompactOverview && hoveredOverviewPanelId === panel.id) || isMobileOverviewExpanded;
  const overviewPanelScale = isCompactOverview || isMobileOverview ? "shadow-2xl" : "";
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
  const mobileCollapsedHeight = 140;

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

  const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
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
      data-panel-id={panel.id}
        className={`panel group relative flex flex-col shrink-0 overflow-hidden bg-muted/30 text-[0.9em] ${layout === "horizontal" ? "snap-start" : ""} ${
        isResizing || isSavingSize
          ? "transition-none"
          : "transform-gpu transition-[width,min-width,max-width,height,min-height,box-shadow,transform] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
      } ${
        isPanelDropTarget ? "ring-2 ring-primary/60 ring-offset-2" : ""
      } ${
        taskMoveModeTaskId ? "ring-2 ring-primary/55 ring-offset-2" : ""
      } ${
        isMobileOverview && mobileExpandedPanelId === panel.id ? "ring-2 ring-primary/40 ring-offset-2" : ""
      } ${
        activePanelId === panel.id ? "z-20 ring-2 ring-primary/40 ring-offset-2" : ""
      } ${draggedPanelStyle(showPanelActions)} ${overviewPanelScale} ${isMobileView && layout === "horizontal" ? "touch-pan-x" : ""}`}
      style={{
        width:
          isOverviewExpanded
          ? "clamp(16rem, 24vw, 22rem)"
            : isCompactOverview
            ? "clamp(4.5rem, 5vw, 5.5rem)"
            : isMobileOverview
            ? "6%"
            : isMobileView && layout === "horizontal"
            ? "40%"
            : layout === "horizontal"
            ? `clamp(${horizontalMinWidth}, ${horizontalWidthValue}, ${horizontalMaxWidth})`
            : "100%",
        height: isCompactOverview
          ? commonOverviewHeight
          : isMobileOverview
            ? mobileExpandedPanelId === panel.id
              ? currentHeight
              : mobileCollapsedHeight
            : currentHeight,
        minWidth: isOverviewExpanded
          ? "16rem"
          : isCompactOverview
            ? "4.5rem"
            : isMobileOverview
            ? "6%"
            : isMobileView && layout === "horizontal"
            ? "40%"
            : layout === "horizontal"
              ? horizontalMinWidth
              : 240,
        maxWidth: isOverviewExpanded
          ? "22rem"
          : isCompactOverview
            ? "5.5rem"
            : isMobileOverview
            ? "6%"
            : isMobileView && layout === "horizontal"
            ? "40%"
            : layout === "horizontal"
              ? horizontalMaxWidth
              : "100%",
        minHeight: isCompactOverview || isMobileOverview ? mobileCollapsedHeight : 260,
        flex: isMobileView && layout === "horizontal" ? "0 0 40%" : "0 0 auto",
        willChange: isResizing ? "width, height" : "width, height, transform, opacity",
      }}
      onClick={(event) => {
        if (taskMoveModeTaskId) {
          event.preventDefault();
          onMoveTaskToPanel(panel.id);
          return;
        }
        if (isCompactOverview) {
          onOverviewPanelSelect(panel.id);
        } else if (isMobileOverview) {
          if (event.target !== event.currentTarget) return;
          onMobileOverviewToggle(panel.id);
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
        className={`relative p-3 ${
          isOverviewExpanded ? "pb-2" : isCompactOverview ? "min-h-[11rem] pb-3" : isMobileOverview ? "pb-3" : "pb-2"
        }`}
        title={showPanelActions && !isCompactOverview && !isMobileOverview ? "Grab the dotted handle to reorder" : undefined}
      >
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-3 text-center">
          {layout === "horizontal" ? (
              <span
                data-panel-overview-label
                className={`absolute left-1/2 top-1/2 block w-max max-w-none -translate-x-1/2 -translate-y-1/2 whitespace-nowrap px-2 text-center text-[1.02rem] font-black leading-none tracking-[0.18em] text-foreground uppercase drop-shadow-sm [writing-mode:vertical-rl] [text-orientation:mixed] rotate-180 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                isCompactOverview ? "opacity-100 scale-100" : "opacity-0 scale-[0.96]"
              }`}
            >
              {panel.name}
            </span>
          ) : isMobileOverview ? (
            <span
              data-panel-overview-label
              className={`absolute left-1/2 top-1/2 block w-full -translate-x-1/2 -translate-y-1/2 text-center text-xl font-semibold tracking-tight ${
                mobileExpandedPanelId === panel.id ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"
              }`}
            >
              {panel.name}
            </span>
          ) : null}
        </div>

        <div
          data-panel-normal-header
          className={`relative flex items-center gap-2 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isCompactOverview || (isMobileOverview && !mobileExpandedPanelId)
              ? "pointer-events-none opacity-0 -translate-y-2 scale-[0.96]"
              : "opacity-100 translate-y-0 scale-100"
          }`}
        >
          {showPanelActions && !isCompactOverview && !isMobileOverview ? (
            <>
              <button
                type="button"
                className="panel-drag absolute left-1/2 -top-1 z-10 hidden h-5 w-14 -translate-x-1/2 items-center justify-center gap-1 rounded-full border border-border/70 bg-background/90 text-muted-foreground opacity-90 shadow-sm transition hover:bg-muted/70 hover:text-foreground md:flex"
                draggable={!isMobileView}
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
              <button
                type="button"
                className="panel-drag absolute left-1/2 -top-1 z-10 flex h-6 w-14 -translate-x-1/2 items-center justify-center rounded-full border border-border/70 bg-background/90 text-xs font-semibold tracking-[0.35em] text-muted-foreground shadow-sm transition hover:bg-muted/70 hover:text-foreground md:hidden"
                onPointerDown={(event) => onMobilePanelPointerDown(panel.id, event)}
                aria-label="Drag panel"
                title="Drag panel"
              >
                ⋮⋮
              </button>
            </>
          ) : null}

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
            <CardTitle className={`flex min-w-0 items-center gap-2 font-medium ${overviewMode ? "text-[0.95rem] max-[767px]:text-[1.15rem]" : "text-[0.8rem] max-[767px]:text-[1rem]"}`}>
              <span className="truncate">{panel.name}</span>
              <Badge variant="secondary" className="text-[0.68rem] max-[767px]:text-[0.82rem]">
                {panel.tasks.length}
              </Badge>
            </CardTitle>
          )}
          <div className="ml-auto flex items-center gap-1">
            {showPanelActions && !isCompactOverview && !isMobileOverview && (
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

      {(layout === "horizontal" || overviewMode || isOverviewExpanded || isMobileOverview) && (
        <CardContent
          data-panel-body
          className={`flex min-h-0 flex-1 flex-col gap-2 p-2 transition-[opacity,transform,max-height] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isCompactOverview
              ? isOverviewExpanded
                ? "max-h-[calc(100%-4.75rem)] opacity-100 translate-y-0"
                : "max-h-0 overflow-hidden opacity-0 translate-y-2 pointer-events-none"
              : isMobileOverview && !mobileExpandedPanelId
                ? "max-h-0 overflow-hidden opacity-0 translate-y-2 pointer-events-none"
                : isMobileOverview
                  ? "items-center text-center"
                  : ""
          }`}
        >
          <div className={`brown-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 [scrollbar-gutter:stable] ${isMobileOverview ? "pt-1" : ""}`}>
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
                  panelId={panel.id}
                  isMobileView={isMobileView}
                  isMobileDragging={mobileDraggedTaskId === task.id}
                  isMobileDragPending={mobileDragPendingTaskId === task.id}
                  isMobileDropTarget={mobileDropTarget?.panelId === panel.id && mobileDropTarget.taskId === task.id}
                  mobileDropPosition={mobileDropTarget?.panelId === panel.id && mobileDropTarget.taskId === task.id ? mobileDropTarget.position : undefined}
                  suppressClick={suppressTaskClick}
                  onMobilePointerDown={(event) => onMobileTaskPointerDown(task, panel.id, event)}
                  taskMoveModeTaskId={taskMoveModeTaskId}
                  activeTaskId={activeTaskId}
                  onTaskHandleClick={onTaskHandleClick}
                  onMoveTaskToPanel={onMoveTaskToPanel}
                  taskItemRefs={taskItemRefs}
                  mobileDraggedTaskPosition={mobileDraggedTaskPosition}
                  mobileDraggedTaskOrigin={mobileDraggedTaskOrigin}
                />
              ))}
          </div>
          {showAddTask && (
            <Button
              variant="ghost"
              className="w-full justify-start text-[0.85rem] text-muted-foreground max-[767px]:text-[1rem]"
              onClick={() => onAddTask(panel.id)}
            >
              <Plus className="mr-2 h-4 w-4 max-[767px]:h-5 max-[767px]:w-5" />
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
  panelId: string;
  isMobileView: boolean;
  isMobileDragging: boolean;
  isMobileDragPending: boolean;
  isMobileDropTarget: boolean;
  mobileDropPosition?: "before" | "after";
  suppressClick: boolean;
  onMobilePointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  taskMoveModeTaskId: string | null;
  activeTaskId: string | null;
  onTaskHandleClick: (task: Task) => void;
  onMoveTaskToPanel: (panelId: string) => void;
  taskItemRefs: RefObject<Map<string, HTMLDivElement | null>>;
  mobileDraggedTaskPosition: { dx: number; dy: number } | null;
  mobileDraggedTaskOrigin: { left: number; top: number; width: number } | null;
}

function TaskCard({
  task,
  onClick,
  onDragStart,
  canModifyTask,
  getPriorityColor,
  panelId,
  isMobileView,
  isMobileDragging,
  isMobileDragPending,
  isMobileDropTarget,
  mobileDropPosition,
  suppressClick,
  onMobilePointerDown,
  taskMoveModeTaskId,
  activeTaskId,
  onTaskHandleClick,
  onMoveTaskToPanel,
  taskItemRefs,
  mobileDraggedTaskPosition,
  mobileDraggedTaskOrigin,
}: TaskCardProps) {
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const isOverdue = task.dueDate && isPast(parseISO(task.dueDate)) && task.status !== "done";
  const canDrag = canModifyTask;
  const isMobileDragActive = isMobileDragging || isMobileDragPending;

  return (
    <Card
      ref={(node) => {
        taskItemRefs.current.set(task.id, node);
      }}
      data-task-id={task.id}
      data-panel-id={panelId}
      className={`border-l-4 transition-all duration-200 hover:shadow-md ${
        canDrag ? "cursor-pointer" : "cursor-not-allowed opacity-80"
      } ${getPriorityColor(task.priority)} ${
        isMobileDragActive ? "scale-[0.98] opacity-50 ring-2 ring-primary/30" : ""
      } ${
        isMobileDropTarget ? "ring-2 ring-primary/50" : ""
      } ${activeTaskId === task.id ? "ring-2 ring-primary/70 ring-offset-2" : ""} ${isMobileView ? "select-none" : ""} ${
        isMobileDragging ? "dragging pointer-events-none" : ""
      }`}
      style={
        isMobileDragging && mobileDraggedTaskPosition
          ? {
              position: "fixed",
              left: mobileDraggedTaskPosition.dx,
              top: mobileDraggedTaskPosition.dy,
              width: mobileDraggedTaskOrigin?.width ?? undefined,
              transform: "translate(-50%, -50%) scale(0.98)",
              opacity: 0.75,
              zIndex: 9999,
              pointerEvents: "none",
            }
          : undefined
      }
      onClick={() => {
        if (suppressClick || (isMobileView && isMobileDragActive) || taskMoveModeTaskId) return;
        onClick();
      }}
      draggable={canDrag}
      onDragStart={canDrag ? onDragStart : undefined}
    >
      <CardContent className={`task ${isMobileView ? "text-center" : ""}`}>
        <div className={`relative flex items-start gap-2 ${isMobileView ? "flex-col items-center" : ""}`}>
          {isMobileView ? (
            <button
              type="button"
              className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background/90 text-muted-foreground shadow-sm touch-none transition-all duration-200 max-[767px]:h-8 max-[767px]:w-8 ${
                canDrag ? "active:scale-95" : "cursor-not-allowed opacity-60"
              } ${isMobileDragActive ? "cursor-grabbing opacity-60" : ""}`}
              disabled={!canDrag}
              onPointerDown={canDrag ? onMobilePointerDown : undefined}
              onClick={(event) => {
                event.stopPropagation();
              }}
              aria-label="Drag task"
              title="Drag task"
            >
              <GripVertical className="h-4 w-4 max-[767px]:h-5 max-[767px]:w-5" />
            </button>
          ) : (
            <button
              type="button"
              className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background/90 text-muted-foreground shadow-sm ${
                canDrag ? "" : "cursor-not-allowed opacity-60"
              }`}
              disabled={!canDrag}
              onClick={(event) => {
                event.stopPropagation();
                onTaskHandleClick(task);
              }}
              aria-label="Drag task"
              title="Drag task"
            >
              <GripVertical className="h-4 w-4 max-[767px]:h-5 max-[767px]:w-5" />
            </button>
          )}
          <div className={`flex-1 space-y-1.5 ${isMobileView ? "w-full" : ""}`}>
            <p className="font-medium leading-tight max-[767px]:text-[0.9rem]">{task.title}</p>
            {task.description?.trim() ? (
              <p className="task-desc text-muted-foreground max-[767px]:text-[0.75rem]">
                {task.description}
              </p>
            ) : null}
            <div className={`flex flex-wrap items-center gap-2 text-xs text-muted-foreground ${isMobileView ? "justify-center max-[767px]:text-[0.8rem]" : ""}`}>
              {task.dueDate && (
                <span
                  className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : ""}`}
                >
                  <Calendar className="h-3 w-3 max-[767px]:h-3.5 max-[767px]:w-3.5" />
                  {format(parseISO(task.dueDate), "MMM d")}
                </span>
              )}
              {task.comments.length > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3 max-[767px]:h-3.5 max-[767px]:w-3.5" />
                  {task.comments.length}
                </span>
              )}
              {task.attachments.length > 0 && (
                <span className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3 max-[767px]:h-3.5 max-[767px]:w-3.5" />
                  {task.attachments.length}
                </span>
              )}
              {task.subtasks.length > 0 && (
                <span className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3 max-[767px]:h-3.5 max-[767px]:w-3.5" />
                  {completedSubtasks}/{task.subtasks.length}
                </span>
              )}
            </div>
            <div className={`flex items-center justify-between ${isMobileView ? "justify-center" : ""}`}>
              <Badge variant="outline" className="text-xs capitalize max-[767px]:text-[0.72rem]">
                {task.priority}
              </Badge>
              {task.assignee && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground max-[767px]:h-6 max-[767px]:w-6 max-[767px]:text-[10px]">
                  {task.assignee.firstName.charAt(0)}
                  {task.assignee.lastName.charAt(0)}
                </div>
              )}
            </div>
            {isMobileDropTarget && mobileDropPosition ? (
              <div className="text-[10px] uppercase tracking-[0.2em] text-primary max-[767px]:text-[0.7rem]">
                Drop {mobileDropPosition}
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
