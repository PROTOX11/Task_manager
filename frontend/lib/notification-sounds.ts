"use client";

import type { Notification, User } from "./types";

type SoundKind = "admin" | "personal" | "public";

const soundMap: Record<SoundKind, string> = {
  admin: "/notification_sound/admin.mp3",
  personal: "/notification_sound/personal.mp3",
  public: "/notification_sound/public.mp3",
};

const playSound = (kind: SoundKind) => {
  if (typeof window === "undefined") return;

  const src = soundMap[kind];
  if (!src) return;

  const audio = new Audio(src);
  audio.volume = 0.55;
  void audio.play().catch(() => {
    // Browsers can block autoplay until the user interacts with the app.
  });
};

export const getProjectChatSoundKind = ({
  isPublicChat,
  senderRole,
}: {
  isPublicChat: boolean;
  senderRole?: User["role"];
}): SoundKind => {
  if (senderRole === "admin") return "admin";
  return isPublicChat ? "public" : "personal";
};

export const getNotificationSoundKind = (
  notification: Notification,
  senderRole?: User["role"]
): SoundKind | null => {
  if (notification.type !== "project_chat_dm" && notification.type !== "comment_mentioned") return null;
  return senderRole === "admin" ? "admin" : "personal";
};

export const playProjectChatSound = (params: {
  isPublicChat: boolean;
  senderRole?: User["role"];
}) => {
  playSound(getProjectChatSoundKind(params));
};

export const playNotificationSound = (params: {
  notification: Notification;
  senderRole?: User["role"];
}) => {
  const kind = getNotificationSoundKind(params.notification, params.senderRole);
  if (!kind) return;
  playSound(kind);
};

export const playInvitationSound = (senderRole?: User["role"]) => {
  playSound(senderRole === "admin" ? "admin" : "personal");
};
