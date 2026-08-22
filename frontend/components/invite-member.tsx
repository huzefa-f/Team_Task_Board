"use client";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";

export function InviteMember({
  projectId,
  onInvited,
}: {
  projectId: number;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.post(`/projects/${projectId}/invite`, { email });
      setSuccess(`Invited ${email}`);
      setEmail("");
      onInvited();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to invite member");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-start">
      <div className="flex-1">
        <input
          type="email"
          placeholder="Invite by email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        />
        {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
        {success && <p className="text-green-600 text-xs mt-1">{success}</p>}
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
      >
        Invite
      </button>
    </form>
  );
}