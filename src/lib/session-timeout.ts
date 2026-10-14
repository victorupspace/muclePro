"use client";

import { useEffect } from "react";

const ACTIVITY_THROTTLE_MS = 30_000;
const CHECK_INTERVAL_MS = 30_000;

export const SESSION_TIMEOUTS = {
  platform: {
    maxAgeMs: 6 * 60 * 60 * 1000,
    inactivityMs: 2 * 60 * 60 * 1000,
  },
  admin: {
    maxAgeMs: 3 * 60 * 60 * 1000,
    inactivityMs: 30 * 60 * 1000,
  },
} as const;

type SessionScope = keyof typeof SESSION_TIMEOUTS;

type SessionRecord = {
  startedAt: number;
  lastActivityAt: number;
};

type UseSessionTimeoutOptions = {
  scope: SessionScope;
  userId?: string | null;
  startedAt?: string | number | null;
  enabled: boolean;
  onExpire: () => void | Promise<void>;
};

function storageKey(scope: SessionScope, userId: string) {
  return `musclepro:session-timeout:${scope}:${userId}`;
}

function readSessionRecord(key: string): SessionRecord | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SessionRecord>;
    if (typeof parsed.startedAt !== "number" || typeof parsed.lastActivityAt !== "number") {
      return null;
    }

    return {
      startedAt: parsed.startedAt,
      lastActivityAt: parsed.lastActivityAt,
    };
  } catch {
    return null;
  }
}

function writeSessionRecord(key: string, record: SessionRecord) {
  window.localStorage.setItem(key, JSON.stringify(record));
}

export function clearSessionTimeout(scope: SessionScope, userId?: string | null) {
  if (typeof window === "undefined" || !userId) return;
  window.localStorage.removeItem(storageKey(scope, userId));
}

export function useSessionTimeout({
  scope,
  userId,
  startedAt,
  enabled,
  onExpire,
}: UseSessionTimeoutOptions) {
  useEffect(() => {
    if (!enabled || !userId) return;

    const key = storageKey(scope, userId);
    const limits = SESSION_TIMEOUTS[scope];
    const sessionStartedAt =
      typeof startedAt === "number"
        ? startedAt
        : startedAt
          ? new Date(startedAt).getTime()
          : null;
    let expired = false;
    let lastActivityWrite = 0;

    function expire() {
      if (expired) return;
      expired = true;
      window.localStorage.removeItem(key);
      void onExpire();
    }

    function ensureRecord(now: number) {
      const current = readSessionRecord(key);
      if (current) {
        if (sessionStartedAt && sessionStartedAt > current.startedAt + 1000) {
          const next = { startedAt: sessionStartedAt, lastActivityAt: now };
          writeSessionRecord(key, next);
          return next;
        }

        return current;
      }

      const next = { startedAt: sessionStartedAt ?? now, lastActivityAt: now };
      writeSessionRecord(key, next);
      return next;
    }

    function checkExpiration() {
      const now = Date.now();
      const current = ensureRecord(now);

      if (
        now - current.startedAt >= limits.maxAgeMs ||
        now - current.lastActivityAt >= limits.inactivityMs
      ) {
        expire();
      }
    }

    function markActivity() {
      if (expired) return;

      const now = Date.now();
      if (now - lastActivityWrite < ACTIVITY_THROTTLE_MS) return;

      const current = ensureRecord(now);
      writeSessionRecord(key, {
        startedAt: current.startedAt,
        lastActivityAt: now,
      });
      lastActivityWrite = now;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        checkExpiration();
        markActivity();
      }
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === key && event.newValue === null) {
        expire();
      }
    }

    ensureRecord(Date.now());
    checkExpiration();

    const activityEvents = ["pointerdown", "keydown", "touchstart", "scroll"];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });
    window.addEventListener("focus", checkExpiration);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = window.setInterval(checkExpiration, CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity);
      });
      window.removeEventListener("focus", checkExpiration);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, onExpire, scope, startedAt, userId]);
}
