"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { apiRequest, getSocketIoBaseUrl, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MessageSquare, Send, Video, Users, Plus, Link2, Copy } from "lucide-react";
import { toast } from "sonner";
import type { Meeting, Project, ChatMessage, User } from "@/lib/types";
import { playProjectChatSound } from "@/lib/notification-sounds";
import { io, Socket } from "socket.io-client";

interface ProjectCollaborationPanelProps {
  project: Project;
}

const PUBLIC_CHAT = "public";

const splitName = (name: string) => {
  const parts = (name || "").trim().split(/\s+/);
  return {
    firstName: parts[0] || "User",
    lastName: parts.slice(1).join(" ") || "",
  };
};

const mapUser = (user: any) => {
  const name = user?.name || "";
  const { firstName, lastName } = splitName(name);
  return {
    id: (user?._id || user?.id || "").toString(),
    email: user?.email || "",
    firstName,
    lastName,
    role: (user?.role === "admin" ? "admin" : "developer") as "admin" | "developer",
    createdAt: new Date().toISOString(),
  };
};

const mapChatMessage = (message: any): ChatMessage => ({
  id: (message?._id || message?.id || "").toString(),
  projectId: (message?.projectId?._id || message?.projectId || "").toString(),
  sender: mapUser(message?.senderId),
  recipient: message?.recipientId ? mapUser(message.recipientId) : null,
  content: message?.content || "",
  createdAt: message?.createdAt || new Date().toISOString(),
  updatedAt: message?.updatedAt || message?.createdAt || new Date().toISOString(),
});

const mapMeeting = (meeting: any): Meeting => ({
  id: (meeting?._id || meeting?.id || "").toString(),
  projectId: (meeting?.projectId?._id || meeting?.projectId || "").toString(),
  createdBy: mapUser(meeting?.createdBy),
  title: meeting?.title || "",
  scheduledFor: meeting?.scheduledFor || new Date().toISOString(),
  notes: meeting?.notes || "",
  createdAt: meeting?.createdAt || new Date().toISOString(),
  updatedAt: meeting?.updatedAt || meeting?.createdAt || new Date().toISOString(),
});

const mapAuthUser = (user: any): User => {
  const name = user?.name || `${user?.firstName || "User"} ${user?.lastName || ""}`.trim();
  const parts = name.split(/\s+/);
  return {
    id: (user?._id || user?.id || "").toString(),
    email: user?.email || "",
    firstName: parts[0] || "User",
    lastName: parts.slice(1).join(" ") || "",
    role: (user?.role === "admin" ? "admin" : "developer") as "admin" | "developer",
    createdAt: new Date().toISOString(),
  };
};

export function ProjectCollaborationPanel({ project }: ProjectCollaborationPanelProps) {
  const { user } = useAuth();
  const { notifications } = useData();
  const [conversationWith, setConversationWith] = useState<string>(PUBLIC_CHAT);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatSearch, setChatSearch] = useState("");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [typingUsers, setTypingUsers] = useState<Array<{ senderId: string; senderName: string }>>([]);
  const [messageContent, setMessageContent] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);
  const typingTimerRef = useRef<number | null>(null);
  const typingClearTimersRef = useRef<Map<string, number>>(new Map());
  const socketRef = useRef<Socket | null>(null);
  const pendingMentionIdsRef = useRef<Set<string>>(new Set());
  const meetingStorageKey = useMemo(() => `zentrixa:meeting-link:${project.id}`, [project.id]);

  const members = useMemo(() => {
    const seen = new Set<string>();
    return project.members.filter((member) => {
      if (member.user.id === user?.id) return false;
      if (seen.has(member.user.id)) return false;
      seen.add(member.user.id);
      return true;
    });
  }, [project.members, user?.id]);

  const visibleMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => {
      const fullName = `${member.user.firstName} ${member.user.lastName}`.toLowerCase();
      return (
        fullName.includes(query) ||
        member.user.email.toLowerCase().includes(query) ||
        member.user.role.toLowerCase().includes(query)
      );
    });
  }, [memberSearch, members]);

  const selectedMemberUnreadCount = useMemo(() => {
    if (conversationWith === PUBLIC_CHAT) return 0;
    return notifications.filter(
      (notification) =>
        notification.projectId === project.id &&
        !notification.read &&
        notification.sender?.id === conversationWith &&
        notification.type === "project_chat_dm"
    ).length;
  }, [conversationWith, notifications, project.id]);

  const publicMentionUnreadCount = useMemo(() => {
    return notifications.filter(
      (notification) =>
        notification.projectId === project.id &&
        !notification.read &&
        notification.type === "comment_mentioned"
    ).length;
  }, [notifications, project.id]);

  const selectedMember = members.find((member) => member.user.id === conversationWith);
  const currentUser = useMemo(() => mapAuthUser(user), [user]);
  const mentionQuery = useMemo(() => {
    const match = messageContent.match(/(?:^|\s)@([\w.-]*)$/);
    return match?.[1] || "";
  }, [messageContent]);
  const mentionSuggestions = useMemo(() => {
    if (!mentionQuery) return [];
    const query = mentionQuery.toLowerCase();
    return members
      .filter((member) => {
        const fullName = `${member.user.firstName} ${member.user.lastName}`.toLowerCase();
        return fullName.includes(query) || member.user.email.toLowerCase().includes(query);
      })
      .slice(0, 5);
  }, [mentionQuery, members]);

  const engagedDevelopers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const member of members) {
      if (member.user.role === "developer") {
        counts.set(member.user.id, 0);
      }
    }

    for (const message of messages) {
      const senderId = message.sender.id;
      if (!counts.has(senderId)) continue;
      const current = counts.get(senderId) || 0;
      counts.set(senderId, current + 1);
    }

    return [...members]
      .filter((member) => member.user.role === "developer")
      .map((member) => ({
        member,
        count: counts.get(member.user.id) || 0,
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        const aName = `${a.member.user.firstName} ${a.member.user.lastName}`.toLowerCase();
        const bName = `${b.member.user.firstName} ${b.member.user.lastName}`.toLowerCase();
        return aName.localeCompare(bName);
      })
      .slice(0, 5);
  }, [members, messages]);

  const filteredMessages = useMemo(() => {
    const query = chatSearch.trim().toLowerCase();
    if (!query) return messages;

    return messages.filter((message) => {
      const senderName = `${message.sender.firstName} ${message.sender.lastName}`.toLowerCase();
      const recipientName = message.recipient
        ? `${message.recipient.firstName} ${message.recipient.lastName}`.toLowerCase()
        : "";
      return (
        message.content.toLowerCase().includes(query) ||
        senderName.includes(query) ||
        recipientName.includes(query)
      );
    });
  }, [chatSearch, messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedLink = window.localStorage.getItem(meetingStorageKey);
    if (storedLink) {
      setMeetingLink(storedLink);
    }
  }, [meetingStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (meetingLink) {
      window.localStorage.setItem(meetingStorageKey, meetingLink);
    } else {
      window.localStorage.removeItem(meetingStorageKey);
    }
  }, [meetingLink, meetingStorageKey]);

  useEffect(() => {
    if (conversationWith !== PUBLIC_CHAT && !selectedMember) {
      setConversationWith(PUBLIC_CHAT);
    }
  }, [conversationWith, selectedMember]);

  useEffect(() => {
    let isMounted = true;
    let refreshTimer: number | null = null;

    const load = async (options?: { silent?: boolean }) => {
      try {
        const chatPath =
          conversationWith === PUBLIC_CHAT
            ? `/projects/${project.id}/chat`
            : `/projects/${project.id}/chat?conversationWith=${conversationWith}`;
        const typingPath =
          conversationWith === PUBLIC_CHAT
            ? `/projects/${project.id}/chat/typing`
            : `/projects/${project.id}/chat/typing?recipientId=${conversationWith}`;

        const [chatResponse, typingResponse, meetingsResponse] = await Promise.all([
          apiRequest<{ messages: Array<any> }>(chatPath),
          apiRequest<{ typingUsers: Array<any> }>(typingPath),
          apiRequest<{ meetings: Array<any> }>(`/projects/${project.id}/meetings`),
        ]);

        if (!isMounted) return;
        setMessages((chatResponse.messages || []).map(mapChatMessage));
        setTypingUsers((typingResponse.typingUsers || []).map((typingUser: any) => ({
          senderId: typingUser.senderId?.toString?.() || "",
          senderName: typingUser.senderName || "Someone",
        })));
        setMeetings((meetingsResponse.meetings || []).map(mapMeeting));
      } catch (error) {
        if (!isMounted) return;
        if (!options?.silent) {
          const message = error instanceof Error ? error.message : "Unable to load collaboration data";
          toast.error(message);
        }
      }
    };

    void load();
    refreshTimer = window.setInterval(() => {
      void load({ silent: true });
    }, 2000);

    return () => {
      isMounted = false;
      if (refreshTimer) {
        window.clearInterval(refreshTimer);
      }
    };
  }, [conversationWith, project.id]);

  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token || typeof window === "undefined" || typeof io === "undefined") {
      return;
    }

    const socket = io(getSocketIoBaseUrl(), {
      transports: ["websocket"],
      auth: { token },
      query: {
        projectId: project.id,
        conversationWith,
      },
    });
    socketRef.current = socket;
    setTypingUsers([]);

    socket.on("chat:message", (payload: any) => {
      try {
        const nextMessage = mapChatMessage(payload);
        const isOwnMessage = nextMessage.sender.id === user?.id;
        const isPublicChat = !nextMessage.recipient;

        if (!isOwnMessage && isPublicChat) {
          playProjectChatSound({
            isPublicChat,
            senderRole: nextMessage.sender.role,
          });
        }

        setMessages((prev) => {
          const withoutDuplicate = prev.filter((message) => message.id !== nextMessage.id);
          return [...withoutDuplicate, nextMessage].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      } catch (error) {
        console.error("Failed to process chat socket event:", error);
      }
    });

    socket.on("chat:typing", (payload: { senderId?: string; senderName?: string }) => {
      if (!payload?.senderId || payload.senderId === user?.id) return;

      setTypingUsers((current) => {
        const next = current.filter((typingUser) => typingUser.senderId !== payload.senderId);
        return [...next, { senderId: payload.senderId, senderName: payload.senderName || "Someone" }];
      });

      const existingTimer = typingClearTimersRef.current.get(payload.senderId);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      const timer = window.setTimeout(() => {
        setTypingUsers((current) => current.filter((typingUser) => typingUser.senderId !== payload.senderId));
        typingClearTimersRef.current.delete(payload.senderId);
      }, 4000);
      typingClearTimersRef.current.set(payload.senderId, timer);
    });

    socket.on("chat:error", (payload: { message?: string }) => {
      if (payload?.message) {
        console.error("Chat socket error:", payload.message);
      }
    });

    return () => {
      socketRef.current = null;
      typingClearTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      typingClearTimersRef.current.clear();
      socket.disconnect();
    };
  }, [conversationWith, project.id, user]);

  useEffect(() => {
    if (!user || !messageContent.trim()) {
      return;
    }

    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
    }

    const pingTyping = async () => {
      try {
        await apiRequest(`/projects/${project.id}/chat/typing`, {
          method: "POST",
          body: JSON.stringify({
            recipientId: conversationWith === PUBLIC_CHAT ? undefined : conversationWith,
          }),
        });
      } catch {
        // Typing is best-effort and should not block chat.
      }
    };

    typingTimerRef.current = window.setTimeout(() => {
      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit("chat:typing");
        return;
      }
      void pingTyping();
    }, 250);

    return () => {
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
      }
    };
  }, [conversationWith, messageContent, project.id, user]);

  const handleSendMessage = async () => {
    if (!messageContent.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      projectId: project.id,
      sender: currentUser,
      recipient: conversationWith === PUBLIC_CHAT ? null : selectedMember?.user || null,
      content: messageContent.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setMessageContent("");
    setTypingUsers([]);

    try {
      setIsSending(true);
      const socket = socketRef.current;
      const mentionedUserIds = Array.from(pendingMentionIdsRef.current);

      if (socket?.connected) {
        socket.emit("chat:message", {
          content: optimisticMessage.content,
          recipientId: conversationWith === PUBLIC_CHAT ? null : conversationWith,
          mentionedUserIds,
        });
      } else {
        const response = await apiRequest<{ chatMessage?: any }>(`/projects/${project.id}/chat`, {
          method: "POST",
          body: JSON.stringify({
            content: optimisticMessage.content,
            recipientId: conversationWith === PUBLIC_CHAT ? undefined : conversationWith,
            mentionedUserIds,
          }),
        });
        if (response.chatMessage) {
          const savedMessage = mapChatMessage(response.chatMessage);
          setMessages((prev) =>
            prev
              .filter((message) => message.id !== tempId && message.id !== savedMessage.id)
              .concat(savedMessage)
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          );
        }
      }
      pendingMentionIdsRef.current.clear();
    } catch (error) {
      setMessages((prev) => prev.filter((message) => message.id !== tempId));
      setMessageContent(optimisticMessage.content);
      const message = error instanceof Error ? error.message : "Unable to send chat message";
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleScheduleMeeting = async () => {
    if (!meetingTitle.trim() || !meetingDate || !meetingTime) {
      toast.error("Add a title, date, and time first.");
      return;
    }

    try {
      setIsScheduling(true);
      await apiRequest(`/projects/${project.id}/meetings`, {
        method: "POST",
        body: JSON.stringify({
          title: meetingTitle,
          scheduledFor: new Date(`${meetingDate}T${meetingTime}:00`).toISOString(),
          notes: meetingNotes,
        }),
      });
      setMeetingTitle("");
      setMeetingDate("");
      setMeetingTime("");
      setMeetingNotes("");
      const response = await apiRequest<{ meetings: Array<any> }>(`/projects/${project.id}/meetings`);
      setMeetings((response.meetings || []).map(mapMeeting));
      setMeetingLink("https://meet.google.com/new");
      window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer");
      toast.success("Meeting scheduled");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to schedule meeting";
      toast.error(message);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCreateMeeting = () => {
    const url = "https://meet.google.com/new";
    setMeetingLink(url);
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("Google Meet opened. Use the link below to share it.");
  };

  const handlePostMeetingLink = async () => {
    if (!meetingLink.trim()) return;

    try {
      await apiRequest(`/projects/${project.id}/chat`, {
        method: "POST",
        body: JSON.stringify({
          content: `Meeting link: ${meetingLink}`,
          recipientId: undefined,
        }),
      });
      toast.success("Meeting link posted to chat");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to post meeting link";
      toast.error(message);
    }
  };

  const copyMeetingLink = async () => {
    if (!meetingLink) return;
    await navigator.clipboard.writeText(meetingLink);
    toast.success("Meeting link copied");
  };

  const insertMention = (memberId: string) => {
    const member = members.find((item) => item.user.id === memberId);
    if (!member) return;

    const mentionLabel = `@${member.user.firstName} ${member.user.lastName}`.trim();
    setMessageContent((current) => {
      const replaced = current.match(/(?:^|\s)@[\w.-]*$/)
        ? current.replace(/(?:^|\s)@[\w.-]*$/, ` ${mentionLabel} `).replace(/^ /, "")
        : `${current}${current && !current.endsWith(" ") ? " " : ""}${mentionLabel} `;
      return replaced;
    });
    pendingMentionIdsRef.current.add(member.user.id);
  };

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
      <Card className="min-w-0 border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Project Chat
          </CardTitle>
        <CardDescription>
          Everyone connected to this project can see public chat. Pick a person for a private conversation.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4">
          <div className="space-y-3">
            <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Chat search</p>
                {chatSearch.trim() && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setChatSearch("")}
                    className="h-7 px-2 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <Input
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                placeholder="Search messages, names, or private chat text..."
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={conversationWith === PUBLIC_CHAT ? "default" : "outline"}
                size="sm"
                className="shrink-0"
                onClick={() => setConversationWith(PUBLIC_CHAT)}
              >
                Everyone
                {publicMentionUnreadCount > 0 && (
                  <span className="ml-2 inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                )}
              </Button>
              {selectedMember && conversationWith !== PUBLIC_CHAT && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setConversationWith(selectedMember.user.id)}
                >
                  {selectedMember.user.firstName} {selectedMember.user.lastName}
                  {selectedMemberUnreadCount > 0 && (
                    <span className="ml-2 inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                  )}
                </Button>
              )}
            </div>

            <div className="relative">
              <Input
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setMemberSearchOpen(true);
                }}
                onFocus={() => setMemberSearchOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setMemberSearchOpen(false), 150);
                }}
                placeholder="Search teammates for a private chat..."
              />
              {memberSearchOpen && memberSearch.trim() && visibleMembers.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 max-h-56 overflow-y-auto rounded-xl border bg-background shadow-lg">
                  {visibleMembers.map((member) => {
                    const isUnread = notifications.some(
                      (notification) =>
                        notification.projectId === project.id &&
                        !notification.read &&
                        notification.sender?.id === member.user.id &&
                        notification.type === "project_chat_dm"
                    );
                    return (
                      <button
                        key={member.user.id}
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-muted/60"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setConversationWith(member.user.id);
                          setMemberSearch("");
                          setMemberSearchOpen(false);
                        }}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {member.user.firstName.charAt(0)}
                            {member.user.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {member.user.firstName} {member.user.lastName}
                            </span>
                            {isUnread && (
                              <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-primary" />
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {member.user.email} · {member.user.role}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {memberSearchOpen && memberSearch.trim() && visibleMembers.length === 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-xl border bg-background p-3 text-sm text-muted-foreground shadow-lg">
                  No teammates match your search.
                </div>
              )}
            </div>
          </div>

          <ScrollArea className="h-[320px] max-w-full rounded-lg border bg-background/50">
            <div className="space-y-3 p-4">
              {filteredMessages.map((message) => {
                const isMine = message.sender.id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isMine ? "justify-end" : ""}`}
                  >
                    {!isMine && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {message.sender.firstName.charAt(0)}
                          {message.sender.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`max-w-[85%] rounded-2xl border px-3 py-2 sm:max-w-[80%] ${isMine ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}>
                      <div className="flex items-center gap-2 text-xs opacity-80">
                        <span className="font-medium">
                          {isMine ? "You" : `${message.sender.firstName} ${message.sender.lastName}`}
                        </span>
                        {message.recipient && (
                          <Badge variant="outline" className="text-[10px]">
                            Private to {message.recipient.firstName}
                          </Badge>
                        )}
                        <span>{format(parseISO(message.createdAt), "MMM d, h:mm a")}</span>
                      </div>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {isMine && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {user?.firstName?.charAt(0) || "Y"}
                          {user?.lastName?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No messages yet. Start the conversation.
                </div>
              )}
              {messages.length > 0 && filteredMessages.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No messages match your search.
                </div>
              )}
            </div>
          </ScrollArea>

          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span>
                {typingUsers.map((typingUser) => typingUser.senderName).join(", ")}
                {typingUsers.length === 1 ? " is typing..." : " are typing..."}
              </span>
            </div>
          )}

          <div className="min-w-0 space-y-3 rounded-xl border bg-muted/20 p-4">
            <div className="space-y-2 rounded-xl border bg-background/80 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Most engaged developers</p>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  Top 5
                </Badge>
              </div>
              <div className="space-y-2">
                {engagedDevelopers.length > 0 ? (
                  engagedDevelopers.map(({ member, count }) => (
                    <div key={member.user.id} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {member.user.firstName.charAt(0)}
                          {member.user.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {member.user.firstName} {member.user.lastName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {member.user.email}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {count} msgs
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No developer activity yet in this chat.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium">
                  {conversationWith === PUBLIC_CHAT
                    ? "Public project chat"
                    : `Private chat with ${selectedMember?.user.firstName} ${selectedMember?.user.lastName}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {conversationWith === PUBLIC_CHAT
                    ? "Visible to everyone connected to this project."
                    : "Only you and this person can see this conversation."}
                </p>
                {conversationWith !== PUBLIC_CHAT && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Private messages also create an instant notification for the recipient.
                  </p>
                )}
              </div>
            </div>
            <div className="relative">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                <Input
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Write a message..."
                  className="min-w-0 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isSending || !messageContent.trim()}
                  className="w-full sm:w-auto"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </Button>
              </div>

              {mentionSuggestions.length > 0 && (
                <div className="absolute bottom-full left-0 z-30 mb-2 w-full overflow-hidden rounded-xl border bg-background shadow-lg">
                  {mentionSuggestions.map((member) => (
                    <button
                      key={member.user.id}
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-muted/60"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        insertMention(member.user.id);
                      }}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {member.user.firstName.charAt(0)}
                          {member.user.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {member.user.firstName} {member.user.lastName}
                          </span>
                          <Badge variant="secondary" className="text-[10px] capitalize">
                            {member.user.role}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-x-auto border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Meeting Schedule
          </CardTitle>
          <CardDescription>
            Admins can schedule project meetings for everyone connected to this project.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4">
          {user?.role === "admin" ? (
            <>
              <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                <div className="flex max-w-full flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" onClick={handleCreateMeeting}>
                    <Plus className="mr-2 h-4 w-4" />
                    Start Meeting Now
                  </Button>
                  <Button onClick={handleScheduleMeeting} disabled={isScheduling}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Meeting
                  </Button>
                </div>
                <Input
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="Meeting title"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                  />
                  <Input
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                  />
                </div>
                <Textarea
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  placeholder="Notes or agenda..."
                  rows={4}
                />
              </div>

              {meetingLink && (
                  <div className="max-w-full rounded-xl border bg-background p-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Link2 className="h-4 w-4" />
                      Meeting link
                    </div>
                  <div className="mt-2 flex max-w-full flex-col gap-2 sm:flex-row">
                    <Input value={meetingLink} readOnly />
                    <Button type="button" variant="outline" onClick={copyMeetingLink}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                    <Button type="button" onClick={() => void handlePostMeetingLink()}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Post to chat
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Opened in a new tab. Share this link with your team.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              Meeting scheduling is available to admins. You can still view the upcoming meetings below.
            </div>
          )}

          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <p className="text-sm font-medium">Upcoming Meetings</p>
            </div>
            <ScrollArea className="h-[220px] max-w-full rounded-lg border">
              <div className="space-y-2 p-3">
                {meetings.map((meeting) => (
                  <div key={meeting.id} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{meeting.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(meeting.scheduledFor), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {meeting.createdBy.firstName}
                      </Badge>
                    </div>
                    {meeting.notes && (
                      <p className="mt-2 text-sm text-muted-foreground">{meeting.notes}</p>
                    )}
                  </div>
                ))}
                {meetings.length === 0 && (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No meetings scheduled yet.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
