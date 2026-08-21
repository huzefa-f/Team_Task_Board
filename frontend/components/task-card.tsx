"use client";
import { Task } from "@/lib/types";

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

export function TaskCard({ task }: { task: Task }) {
  return (
    <div className="border rounded p-3 bg-white space-y-2 shadow-sm">
      <p className="font-medium">{task.title}</p>
      <div className="flex items-center justify-between text-xs">
        <span className={`px-2 py-0.5 rounded ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        {task.due_date && (
          <span className="text-gray-500">{new Date(task.due_date).toLocaleDateString()}</span>
        )}
      </div>
      {task.assignee && (
        <p className="text-xs text-gray-600">Assigned to {task.assignee.name}</p>
      )}
    </div>
  );
}