"use client";
import { ActivityLogEntry } from "@/lib/types";

function describeEntry(entry: ActivityLogEntry): string {
  switch (entry.action) {
    case "task_created":
      return `${entry.actor_name} created "${entry.task_title}"`;
    case "task_assigned":
      return `${entry.actor_name} ${entry.detail?.toLowerCase() ?? "updated assignment"} on "${entry.task_title}"`;
    case "status_changed":
      return `${entry.actor_name} changed status of "${entry.task_title}" (${entry.detail})`;
    case "task_edited":
      return `${entry.actor_name} edited "${entry.task_title}"`;
    case "member_invited":
      return `${entry.actor_name} ${entry.detail?.toLowerCase() ?? "invited a member"}`;
    default:
      return `${entry.actor_name} did something`;
  }
}

export function ActivityLog({ entries }: { entries: ActivityLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-500">No activity yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="text-sm border-l-2 border-gray-200 pl-3">
          <p>{describeEntry(entry)}</p>
          <p className="text-xs text-gray-400">
            {new Date(entry.created_at).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  );
}