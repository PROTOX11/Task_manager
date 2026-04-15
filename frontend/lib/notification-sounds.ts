"use client";

import type { Notification, User } from "./types";

type SoundKind = "admin" | "personal" | "public";
type ZentrixaCueKind = "listening" | "thinking" | "reply";

const soundMap: Record<SoundKind, string> = {
  admin: "/notification_sound/admin.mp3",
  personal: "/notification_sound/personal.mp3",
  public: "/notification_sound/public.mp3",
};

const zentrixaSound = "/sounds/zentrixa.mp3";
const cooldowns = new Map<string, number>();
const SOUND_COOLDOWN_MS = 4000;

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const playSound = (kind: SoundKind, key: string = kind) => {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const lastPlayed = cooldowns.get(key) || 0;
  if (now - lastPlayed < SOUND_COOLDOWN_MS) return;
  cooldowns.set(key, now);

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
  if (
    notification.type !== "project_chat_dm" &&
    notification.type !== "comment_mentioned" &&
    notification.type !== "meeting_reminder" &&
    notification.type !== "task_assigned" &&
    notification.type !== "project_added" &&
    notification.type !== "task_overdue" &&
    notification.type !== "deadline_risk" &&
    notification.type !== "need_help"
  ) {
    return null;
  }
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

export const playAttentionPing = (kind: SoundKind = "admin") => {
  playSound(kind, "zentrixa-ping");
};

export const playZentrixaPing = () => {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const key = "zentrixa-local";
  const lastPlayed = cooldowns.get(key) || 0;
  if (now - lastPlayed < SOUND_COOLDOWN_MS) return;
  cooldowns.set(key, now);

  const audio = new Audio(zentrixaSound);
  audio.volume = 0.45;
  void audio.play().catch(() => {
    // Browsers can block autoplay until the user interacts with the app.
  });
};

const cueMap: Record<ZentrixaCueKind, { frequency: number; duration: number; gain: number }> = {
  listening: { frequency: 196, duration: 0.18, gain: 0.08 },
  thinking: { frequency: 146, duration: 0.12, gain: 0.07 },
  reply: { frequency: 523, duration: 0.1, gain: 0.09 },
};

const playTone = (kind: ZentrixaCueKind) => {
  if (typeof window === "undefined") return;

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return;

  const config = cueMap[kind];
  const audioContext = new AudioContextCtor();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = kind === "reply" ? "sine" : "triangle";
  oscillator.frequency.value = config.frequency;

  gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(config.gain, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + config.duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + config.duration + 0.02);

  oscillator.onended = () => {
    gainNode.disconnect();
    oscillator.disconnect();
    void audioContext.close().catch(() => {});
  };
};

export const playZentrixaListeningCue = () => playTone("listening");
export const playZentrixaThinkingCue = () => playTone("thinking");
export const playZentrixaReplyCue = () => playTone("reply");
