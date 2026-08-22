"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "./notification-bell";

export function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="flex justify-between items-center px-6 py-4 border-b">
      <Link href="/projects" className="font-semibold">
        Team Task Board
      </Link>
      <div className="flex items-center gap-4">
        <NotificationBell />
        <span className="text-sm">{user?.name}</span>
        <button onClick={logout} className="text-sm underline">
          Log out
        </button>
      </div>
    </header>
  );
}