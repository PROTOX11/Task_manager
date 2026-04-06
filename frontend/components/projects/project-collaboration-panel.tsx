"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MessageSquare, Send, Video, Users } from "lucide-react";
import { toast } from "sonner";
import type { Meeting, Project, ChatMessage, User } from "@/lib/types";

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
  const [conversationWith, setConversationWith] = useState<string>(PUBLIC_CHAT);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [typingUsers, setTypingUsers] = useState<Array<{ senderId: string; senderName: string }>>([]);
  const [messageContent, setMessageContent] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const typingTimerRef = useRef<number | null>(null);

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

  const selectedMember = members.find((member) => member.user.id === conversationWith);
  const currentUser = useMemo(() => mapAuthUser(user), [user]);

  useEffect(() => {
    if (conversationWith !== PUBLIC_CHAT && !selectedMember) {
      setConversationWith(PUBLIC_CHAT);
    }
  }, [conversationWith, selectedMember]);

  useEffect(() => {
    let isMounted = true;

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

    const interval = window.setInterval(() => {
      void load({ silent: true });
    }, 1000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [conversationWith, project.id]);

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
      await apiRequest(`/projects/${project.id}/chat`, {
        method: "POST",
        body: JSON.stringify({
          content: optimisticMessage.content,
          recipientId: conversationWith === PUBLIC_CHAT ? undefined : conversationWith,
        }),
      });
      const chatPath =
        conversationWith === PUBLIC_CHAT
          ? `/projects/${project.id}/chat`
          : `/projects/${project.id}/chat?conversationWith=${conversationWith}`;
      const refreshed = await apiRequest<{ messages: Array<any> }>(chatPath);
      setMessages((refreshed.messages || []).map(mapChatMessage));
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
      toast.success("Meeting scheduled");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to schedule meeting";
      toast.error(message);
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Project Chat
          </CardTitle>
          <CardDescription>
            Everyone connected to this project can see public chat. Pick a person for a private conversation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search teammates for a private chat..."
            />
            <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
              <Button
                type="button"
                variant={conversationWith === PUBLIC_CHAT ? "default" : "outline"}
                size="sm"
                className="shrink-0"
                onClick={() => setConversationWith(PUBLIC_CHAT)}
              >
                Everyone
              </Button>
              {visibleMembers.map((member) => (
                <Button
                  key={member.user.id}
                  type="button"
                  variant={conversationWith === member.user.id ? "default" : "outline"}
                  size="sm"
                  className="shrink-0"
                  onClick={() => setConversationWith(member.user.id)}
                >
                  {member.user.firstName} {member.user.lastName}
                </Button>
              ))}
            </div>
            {visibleMembers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No teammates match your search.
              </p>
            )}
          </div>

          <ScrollArea className="h-[320px] rounded-lg border bg-background/50">
            <div className="space-y-3 p-4">
              {messages.map((message) => {
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

          <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
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
            <div className="flex flex-col gap-2 sm:flex-row">
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
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Meeting Schedule
          </CardTitle>
          <CardDescription>
            Admins can schedule project meetings for everyone connected to this project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user?.role === "admin" ? (
            <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
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
              <Button onClick={handleScheduleMeeting} disabled={isScheduling}>
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Meeting
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              Meeting scheduling is available to admins. You can still view the upcoming meetings below.
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <p className="text-sm font-medium">Upcoming Meetings</p>
            </div>
            <ScrollArea className="h-[220px] rounded-lg border">
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
