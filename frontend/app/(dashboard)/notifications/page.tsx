"use client";

import Link from "next/link";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Bell, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

const getNotificationLabel = (type: string) => {
  if (type === "project_chat_dm") return "Private message";
  if (type === "comment_mentioned") return "Mention";
  if (type === "task_assigned") return "Task assigned";
  if (type === "due_date_updated") return "Due date updated";
  return "Update";
};

export default function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useData();

  const unreadNotifications = notifications.filter((notification) => !notification.read);

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    toast.success("All notifications marked as read");
  };

  const handleMarkRead = async (notificationId: string) => {
    await markNotificationRead(notificationId);
    toast.success("Notification marked as read");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Task updates and reminders from your workspace
          </p>
        </div>
        <Button onClick={handleMarkAllRead} disabled={notifications.length === 0 || unreadNotifications.length === 0}>
          <Check className="mr-2 h-4 w-4" />
          Mark All Read
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Inbox
          </CardTitle>
          <CardDescription>
            {unreadNotifications.length} unread of {notifications.length} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-lg border p-4 transition-colors ${
                  notification.read ? "bg-background" : "bg-muted/30"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{notification.title}</p>
                      {!notification.read && <Badge>New</Badge>}
                      <Badge variant="secondary">{getNotificationLabel(notification.type)}</Badge>
                      {notification.sender && (
                        <Badge variant="outline">
                          {notification.sender.firstName} {notification.sender.lastName}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(notification.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    {notification.taskId && notification.projectId && (
                      <Link
                        href={`/projects/${notification.projectId}`}
                        className="text-sm text-primary hover:underline"
                      >
                        View project
                      </Link>
                    )}
                    {notification.type === "project_chat_dm" && notification.projectId && (
                      <Link
                        href={`/projects/${notification.projectId}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Open chat
                      </Link>
                    )}
                  </div>
                  <div className="flex flex-row gap-2 sm:flex-col">
                    {!notification.read && (
                      <Button size="sm" variant="outline" onClick={() => handleMarkRead(notification.id)}>
                        <Loader2 className="mr-2 h-4 w-4" />
                        Mark read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <Bell className="mx-auto mb-3 h-10 w-10" />
                <p className="text-lg font-medium">No notifications yet</p>
                <p className="mt-1">You’ll see mentions, private messages, task updates, and due-date changes here.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
