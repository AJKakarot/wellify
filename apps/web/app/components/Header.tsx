"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createApiClient } from "@health-tracker/api-client";
import type { AuthUser } from "@health-tracker/api-client";

interface HeaderProps {
  user: AuthUser | null;
  trailing?: React.ReactNode;
}

export default function Header({ user, trailing }: HeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const client = createApiClient(window.location.origin, { credentials: "include" });
      await client.signOut();
      router.replace("/");
    } catch {
      router.replace("/");
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md">
      <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-extrabold text-sm cursor-pointer relative"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {(user?.name?.[0] ?? user?.email?.[0] ?? "W").toUpperCase()}
          </div>
          <h1 className="text-xl font-bold tracking-tighter text-primary">Wellify</h1>
        </div>
        <div className="flex items-center gap-3">
          {trailing}
          <a
            href="/settings"
            className="w-9 h-9 rounded-full bg-surface-low flex items-center justify-center text-stone-400 hover:text-primary hover:bg-surface-high transition-all"
          >
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </a>
        </div>
      </div>

      {/* Dropdown */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-6 top-16 z-40 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_24px_48px_-12px_rgba(27,28,28,0.12)] overflow-hidden min-w-[220px]">
            <div className="px-5 py-4">
              <p className="font-bold text-sm text-primary truncate">{user?.name ?? "User"}</p>
              <p className="text-xs text-stone-400 truncate">{user?.email}</p>
            </div>
            <div className="h-px bg-surface-high" />
            <a href="/settings" className="flex items-center gap-3 px-5 py-3 hover:bg-surface-low transition-colors" onClick={() => setMenuOpen(false)}>
              <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-bold text-on-surface-variant">Settings</span>
            </a>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center gap-3 px-5 py-3 w-full hover:bg-surface-low transition-colors text-left"
            >
              <svg className="w-4 h-4 text-error/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm font-bold text-error/70">
                {signingOut ? "Signing out..." : "Sign Out"}
              </span>
            </button>
          </div>
        </>
      )}
    </header>
  );
}
