"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Film, LogOut, User } from "lucide-react";

export function TopNav() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-gray-900">
          <Film className="h-5 w-5 text-yellow-500" />
          <span>Xiaohuang Editor</span>
        </Link>

        {session?.user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>{session.user.name || session.user.email}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
