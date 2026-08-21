"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

type Project = {
  id: number;
  name: string;
  owner_id: number;
  created_at: string;
};

function ProjectsList() {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadProjects() {
    setLoading(true);
    try {
      const data = await api.get<Project[]>("/projects");
      setProjects(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      await api.post("/projects", { name: newProjectName });
      setNewProjectName("");
      await loadProjects();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">My Projects</h1>
        <div className="flex items-center gap-3 text-sm">
          <span>{user?.name}</span>
          <button onClick={logout} className="underline">Log out</button>
        </div>
      </div>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          placeholder="New project name"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={creating}
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
        >
          Create
        </button>
      </form>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : projects.length === 0 ? (
        <p className="text-gray-500">No projects yet. Create one above.</p>
      ) : (
        <ul className="space-y-2">
          {projects.map((project) => (
            <li key={project.id} className="border rounded p-4 hover:bg-gray-50">
              <Link href={`/projects/${project.id}`} className="font-medium">
                {project.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default function ProjectsPage() {
  return (
    <ProtectedRoute>
      <ProjectsList />
    </ProtectedRoute>
  );
}