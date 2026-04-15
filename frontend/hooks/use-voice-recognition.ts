"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: Event & { results: ArrayLike<any>; resultIndex: number }) => void) | null;
  onerror: ((event: Event & { error?: string; message?: string }) => void) | null;
  onend: ((event: Event) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export interface UseVoiceRecognitionOptions {
  lang?: string;
  onFinalResult?: (text: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  silenceTimeoutMs?: number;
  noSpeechTimeoutMs?: number;
  maxSessionMs?: number;
}

const normalizeWhitespace = (value = "") => value.replace(/\s+/g, " ").trim();

const normalizeVoiceError = (message: string) => {
  const lower = message.toLowerCase();

  if (lower.includes("not-allowed") || lower.includes("permission")) {
    return "Microphone permission was blocked.";
  }

  if (lower.includes("no-speech")) {
    return "No speech was detected.";
  }

  if (lower.includes("audio-capture")) {
    return "No microphone was found.";
  }

  if (lower.includes("network")) {
    return "Browser SpeechRecognition failed with a network error. Try Chrome or check the browser speech service.";
  }

  if (lower.includes("service-not-allowed")) {
    return "Browser SpeechRecognition is blocked in this browser.";
  }

  if (lower.includes("language-not-supported")) {
    return "That speech language is not supported in this browser.";
  }

  return message;
};

const getSpeechRecognitionCtor = (): SpeechRecognitionConstructor | null => {
  if (typeof window === "undefined") return null;
  const browserWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition || null;
};

export function useVoiceRecognition(options: UseVoiceRecognitionOptions = {}) {
  const {
    lang = "en-IN",
    onFinalResult,
    onStart,
    onEnd,
    onError,
    noSpeechTimeoutMs = 5000,
    maxSessionMs = 15000,
  } = options;

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const noSpeechTimerRef = useRef<number | null>(null);
  const maxSessionTimerRef = useRef<number | null>(null);
  const isMutedRef = useRef(false);
  const finalResultSentRef = useRef(false);
  /* confirmedTranscriptRef holds only the *final* (confirmed) parts of speech.
     currentInterimRef holds the latest *interim* (unconfirmed) text that
     replaces itself on every onresult event instead of accumulating. */
  const confirmedTranscriptRef = useRef("");
  const currentInterimRef = useRef("");
  const [supported, setSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [micScale, setMicScale] = useState(1);

  /* ── Web Audio API volume analyser ── */
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const volumeRafRef = useRef<number | null>(null);

  const stopVolumeAnalysis = useCallback(() => {
    if (volumeRafRef.current !== null) {
      cancelAnimationFrame(volumeRafRef.current);
      volumeRafRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setMicScale(1);
  }, []);

  const startVolumeAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        /* Compute average volume from frequency data */
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length; // 0-255
        /* Map 0-255 → 1.0 – 1.5 scale for the ring animation */
        const scale = 1 + Math.min(average / 255, 1) * 0.5;
        setMicScale(scale);
        volumeRafRef.current = requestAnimationFrame(tick);
      };

      volumeRafRef.current = requestAnimationFrame(tick);
    } catch {
      /* Mic permission already granted for SpeechRecognition, but just in case */
      setMicScale(1);
    }
  }, []);

  const onFinalResultRef = useRef(onFinalResult);
  const onStartRef = useRef(onStart);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onFinalResultRef.current = onFinalResult;
  }, [onFinalResult]);

  useEffect(() => {
    onStartRef.current = onStart;
  }, [onStart]);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  const clearTimers = useCallback(() => {
    if (noSpeechTimerRef.current !== null) {
      window.clearTimeout(noSpeechTimerRef.current);
      noSpeechTimerRef.current = null;
    }

    if (maxSessionTimerRef.current !== null) {
      window.clearTimeout(maxSessionTimerRef.current);
      maxSessionTimerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    clearTimers();
    isMutedRef.current = false;
    finalResultSentRef.current = false;
    confirmedTranscriptRef.current = "";
    currentInterimRef.current = "";
    setIsMuted(false);
    stopVolumeAnalysis();
  }, [clearTimers, stopVolumeAnalysis]);

  const stopRecognition = useCallback((abort = false) => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      cleanup();
      return;
    }

    try {
      if (abort) {
        recognition.abort();
      } else {
        recognition.stop();
      }
    } catch {
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    }
  }, [cleanup]);

  const emitError = useCallback((message: string) => {
    setError(message);
    onErrorRef.current?.(message);
  }, []);

  const attachRecognitionHandlers = useCallback((recognition: SpeechRecognitionLike) => {
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setTranscript("");
      confirmedTranscriptRef.current = "";
      currentInterimRef.current = "";
      finalResultSentRef.current = false;
      onStartRef.current?.();

      clearTimers();
      noSpeechTimerRef.current = window.setTimeout(() => {
        if (!finalResultSentRef.current) {
          emitError("No speech was detected.");
          stopRecognition(false);
        }
      }, noSpeechTimeoutMs);

      maxSessionTimerRef.current = window.setTimeout(() => {
        if (!finalResultSentRef.current) {
          emitError("Speech recognition timed out.");
          stopRecognition(false);
        }
      }, maxSessionMs);
    };

    recognition.onresult = (event) => {
      let finalParts = confirmedTranscriptRef.current;
      let interimParts = "";
      let sawFinal = false;

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const value = normalizeWhitespace(String(result?.[0]?.transcript || ""));
        if (!value) continue;

        if (result.isFinal) {
          /* Append confirmed text to the final buffer */
          finalParts = finalParts ? `${finalParts} ${value}` : value;
          sawFinal = true;
        } else {
          /* Replace (not append) the interim buffer */
          interimParts = value;
        }
      }

      finalParts = normalizeWhitespace(finalParts);
      confirmedTranscriptRef.current = finalParts;
      currentInterimRef.current = interimParts;

      /* Build display transcript: confirmed + current interim */
      const displayTranscript = normalizeWhitespace(
        interimParts ? `${finalParts} ${interimParts}` : finalParts
      );

      if (displayTranscript) {
        setTranscript(displayTranscript);
        clearTimers();
      }

      if (sawFinal && finalParts && !finalResultSentRef.current && !isMutedRef.current) {
        finalResultSentRef.current = true;
        onFinalResultRef.current?.(finalParts);
        stopRecognition(false);
      }
    };

    recognition.onerror = (event) => {
      clearTimers();
      const message = normalizeVoiceError(event.error || event.message || "Voice recognition failed.");
      emitError(message);
      confirmedTranscriptRef.current = "";
      currentInterimRef.current = "";
      stopRecognition(true);
    };

    recognition.onend = () => {
      clearTimers();
      setIsListening(false);
      setIsMuted(false);
      isMutedRef.current = false;
      stopVolumeAnalysis();
      onEndRef.current?.();

      const fallbackTranscript = confirmedTranscriptRef.current.trim();
      if (fallbackTranscript && !finalResultSentRef.current) {
        finalResultSentRef.current = true;
        onFinalResultRef.current?.(fallbackTranscript);
      }
    };
  }, [clearTimers, emitError, maxSessionMs, noSpeechTimeoutMs, stopRecognition, stopVolumeAnalysis]);

  const ensureRecognition = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      return null;
    }

    if (!recognitionRef.current) {
      const recognition = new Ctor();
      attachRecognitionHandlers(recognition);
      recognitionRef.current = recognition;
    }

    return recognitionRef.current;
  }, [attachRecognitionHandlers]);

  const startListening = useCallback(async () => {
    if (isListening) return;

    const recognition = ensureRecognition();
    if (!recognition) {
      emitError("Voice input is not supported in this browser.");
      return;
    }

    try {
      setTranscript("");
      setError(null);
      confirmedTranscriptRef.current = "";
      currentInterimRef.current = "";
      finalResultSentRef.current = false;
      isMutedRef.current = false;
      setIsMuted(false);

      recognition.lang = lang;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.start();
      /* Start volume analysis for the ring animation */
      startVolumeAnalysis();
    } catch (err) {
      const message = normalizeVoiceError(err instanceof Error ? err.message : "Voice input could not start.");
      emitError(message);
    }
  }, [emitError, ensureRecognition, isListening, lang, startVolumeAnalysis]);

  const stopListening = useCallback(() => {
    clearTimers();
    stopRecognition(false);
    stopVolumeAnalysis();
  }, [clearTimers, stopRecognition, stopVolumeAnalysis]);

  const toggleMute = useCallback(() => {
    if (!isListening) return;

    const nextMuted = !isMutedRef.current;
    isMutedRef.current = nextMuted;
    setIsMuted(nextMuted);
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    confirmedTranscriptRef.current = "";
    currentInterimRef.current = "";
    setTranscript("");
  }, []);

  const status = isListening ? (isMuted ? "muted" : "listening") : error ? "error" : "idle";

  useEffect(() => {
    return () => {
      clearTimers();
      stopRecognition(true);
      stopVolumeAnalysis();
    };
  }, [clearTimers, stopRecognition, stopVolumeAnalysis]);

  return {
    supported,
    isListening,
    isMuted,
    transcript,
    error,
    micScale,
    status,
    startListening,
    stopListening,
    toggleMute,
    resetTranscript,
  };
}
