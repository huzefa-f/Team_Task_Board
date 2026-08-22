"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "./api";
import { NotificationEntry } from "./types";
import { useAuth } from "./auth-context";

const POLL_INTERVAL_MS = 10000;

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [list, countData] = await Promise.all([
        api.get<NotificationEntry[]>("/notifications"),
        api.get<{ count: number }>("/notifications/unread-count"),
      ]);
      setNotifications(list);
      setUnreadCount(countData.count);
    } catch {
      // Silently ignore poll failures — a missed poll isn't worth
      // surfacing an error banner over; the next poll will retry.
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, refresh]);

  async function markRead(notificationId: number) {
    setNotifications((current) =>
      current.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await api.patch(`/notifications/${notificationId}/read`);
    } catch {
      // If this fails, the next poll (within 10s) will correct the
      // local state back to what the server actually has.
      refresh();
    }
  }

  return { notifications, unreadCount, markRead, refresh };
}