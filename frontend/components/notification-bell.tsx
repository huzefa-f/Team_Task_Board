"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/lib/use-notifications";

export function NotificationBell() {
  const { notifications, unreadCount, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleClick(notificationId: number, projectId: number, isRead: boolean) {
    if (!isRead) markRead(notificationId);
    setOpen(false);
    router.push(`/projects/${projectId}`);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative text-xl"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 border rounded bg-white shadow-lg max-h-96 overflow-y-auto z-10">
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500 p-4">No notifications yet.</p>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => handleClick(n.id, n.project_id, n.is_read)}
                  className={`text-sm p-3 border-b cursor-pointer hover:bg-gray-50 ${
                    n.is_read ? "text-gray-500" : "font-medium"
                  }`}
                >
                  <p>{n.message}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}