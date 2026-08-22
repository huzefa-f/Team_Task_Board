"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { TaskCard } from "@/components/task-card";
import { api, ApiError } from "@/lib/api";
import { Project, ProjectMember, Task } from "@/lib/types";
import { ActivityLog } from "@/components/activity-log";
import { ActivityLogEntry } from "@/lib/types";
import { AppHeader } from "@/components/app-header";

const COLUMNS: { key: Task["status"]; label: string }[] = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

function ProjectBoard({ projectId }: { projectId: number }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [showActivity, setShowActivity] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [projectData, membersData, tasksData, activityData] = await Promise.all([
        api.get<Project>(`/projects/${projectId}`),
        api.get<ProjectMember[]>(`/projects/${projectId}/members`),
        api.get<Task[]>(`/projects/${projectId}/tasks`),
        api.get<ActivityLogEntry[]>(`/projects/${projectId}/activity`),
      ]);
      setProject(projectData);
      setMembers(membersData);
      setTasks(tasksData);
      setActivity(activityData);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("You don't have access to this project.");
      } else if (err instanceof ApiError && err.status === 404) {
        setError("Project not found.");
      } else {
        setError("Failed to load project.");
      }
    } finally {
      setLoading(false);
    }
}

  async function handleStatusChange(taskId: number, newStatus: Task["status"]) {
    const previousTasks = tasks;
    setTasks((current) =>
      current.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await api.patch(`/projects/${projectId}/tasks/${taskId}`, { status: newStatus });
      const activityData = await api.get<ActivityLogEntry[]>(`/projects/${projectId}/activity`);
      setActivity(activityData);
    } catch (err) {
      setTasks(previousTasks);
      setError(err instanceof ApiError ? err.message : "Failed to update task status");
    }
}

  useEffect(() => {
    loadAll();
  }, [projectId]);

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      await api.post(`/projects/${projectId}/tasks`, {
        title,
        priority,
        due_date: dueDate || null,
        assignee_id: assigneeId ? Number(assigneeId) : null,
      });
      setTitle("");
      setPriority("medium");
      setDueDate("");
      setAssigneeId("");
      await loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create task");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-red-600">{error}</p>
        <button onClick={() => router.push("/projects")} className="underline text-sm">
          Back to projects
        </button>
      </div>
    );
  }

  const filteredTasks = tasks.filter((t) => {
  if (filterAssignee && String(t.assignee_id) !== filterAssignee) return false;
  if (filterPriority && t.priority !== filterPriority) return false;
  return true;
});

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <AppHeader />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{project?.name}</h1>
        <button onClick={() => router.push("/projects")} className="text-sm underline">
          Back to projects
        </button>
      </div>
      
      <button
        onClick={() => setShowActivity(!showActivity)}
        className="text-sm underline"
      >
        {showActivity ? "Hide" : "Show"} activity log
      </button>

      {showActivity && (
        <div className="border rounded p-4 max-h-64 overflow-y-auto">
          <ActivityLog entries={activity} />
        </div>
      )}

      <form onSubmit={handleCreateTask} className="border rounded p-4 space-y-3">
        <p className="font-medium text-sm">New task</p>
        <input
          type="text"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <div className="grid grid-cols-3 gap-2">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Task["priority"])}
            className="border rounded px-3 py-2"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.user.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          Add task
        </button>
      </form>

      <div className="flex gap-2">
        <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
        >
            <option value="">All assignees</option>
            {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
                {m.user.name}
            </option>
            ))}
        </select>
        <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
        >
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
        </select>
    </div>

      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
            <div key={col.key} className="space-y-3">
                <h2 className="font-medium text-sm text-gray-600">
                    {col.label} ({filteredTasks.filter((t) => t.status === col.key).length})
                </h2>
                <div className="space-y-2">
                        {filteredTasks
                    .filter((t) => t.status === col.key)
                    .map((task) => (
                        <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} />
                    ))}
                </div>
            </div>
        ))}
        </div>
    </main>
  );
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ProtectedRoute>
      <ProjectBoard projectId={Number(id)} />
    </ProtectedRoute>
  );
}