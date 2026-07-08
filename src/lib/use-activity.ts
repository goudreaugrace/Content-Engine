import { useCallback, useEffect, useState } from "react";
import { api, type ActivityEvent } from "./api";

/**
 * Shared activity-feed hook. Used by both the sidebar (for the unread
 * badge on the Review Cycle nav item) and the Review Cycle page itself
 * (for the recent-activity widget at the top).
 *
 * Two pieces of state that need to stay in sync across components:
 *
 *   1. The fetched events list. Each consumer can poll independently;
 *      the freshness gap is short.
 *   2. The "last seen" ISO timestamp, persisted in localStorage. When
 *      the user clicks "Mark all as seen" on the widget, the sidebar
 *      badge needs to drop to zero. We do this with a window-scoped
 *      custom event so any other mounted instance re-reads localStorage.
 */
const STORAGE_KEY = "activity-last-seen-v1";
const SYNC_EVENT = "activity-last-seen-changed";
const POLL_INTERVAL_MS = 30_000;

function readLastSeen(): string {
  if (typeof window === "undefined") return new Date(0).toISOString();
  try {
    return (
      localStorage.getItem(STORAGE_KEY) ?? new Date(0).toISOString()
    );
  } catch {
    return new Date(0).toISOString();
  }
}

function writeLastSeen(iso: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, iso);
    // Broadcast same-tab so siblings re-read without waiting for the
    // next poll cycle. (The native 'storage' event only fires
    // cross-tab.)
    window.dispatchEvent(new Event(SYNC_EVENT));
  } catch {
    /* localStorage unavailable — non-fatal */
  }
}

export function useActivity(): {
  events: ActivityEvent[];
  loading: boolean;
  lastSeen: string;
  unreadCount: number;
  unread: ActivityEvent[];
  /** Marks everything currently visible as seen. */
  markAllSeen: () => void;
  /** Force-refresh the events list. */
  refresh: () => Promise<void>;
} {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSeen, setLastSeen] = useState<string>(() => readLastSeen());

  const refresh = useCallback(async () => {
    try {
      const data = await api.listActivity();
      setEvents(data);
    } catch {
      /* keep the previous events on failure so the badge doesn't flicker */
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + poll for fresh events.
  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  // React to lastSeen changes from any other mounted instance.
  useEffect(() => {
    const onChange = () => setLastSeen(readLastSeen());
    window.addEventListener(SYNC_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(SYNC_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const markAllSeen = useCallback(() => {
    const now = new Date().toISOString();
    writeLastSeen(now);
    setLastSeen(now);
  }, []);

  const unread = events.filter((e) => +new Date(e.at) > +new Date(lastSeen));

  return {
    events,
    loading,
    lastSeen,
    unreadCount: unread.length,
    unread,
    markAllSeen,
    refresh,
  };
}
