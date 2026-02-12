import { useEffect, useState } from "react";
import type { Session } from "../calendar/types";

interface TopBarProps {
  session: Session;
  onLogout: () => void;
}

export default function TopBar({ session, onLogout }: TopBarProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  // ESC to close modal
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowConfirm(false);
    }
    if (showConfirm) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showConfirm]);

  const initials = (session.username || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <>
      {/* Top Bar */}
      <div className="sticky top-0 z-40">
        <div className="bg-slate-700 border-b border-slate-600">
          <div className="px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Brand */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                  <div className="h-5 w-5 rounded bg-sky-400/80" />
                </div>

                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-semibold text-white tracking-tight leading-tight">
                    makoCalendar
                  </h1>
                </div>
              </div>

              {/* Right: User + Logout */}
              <div className="flex items-center gap-3 sm:gap-4">
                {/* User */}
                <div className="hidden sm:flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-3 py-2">
                  <div className="h-9 w-9 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
                    <span className="text-sm font-semibold text-sky-200">
                      {initials}
                    </span>
                  </div>

                  <div className="leading-tight">
                    <p className="text-sm font-medium text-white">
                      {session.username}
                    </p>
                    <p className="text-xs text-slate-300">Signed in</p>
                  </div>
                </div>

                {/* Logout */}
                <button
                  onClick={() => setShowConfirm(true)}
                  className="group relative px-4 py-2 rounded-xl text-sm font-semibold text-white
                             bg-gradient-to-r from-rose-600 to-red-600
                             hover:from-rose-500 hover:to-red-500
                             shadow-lg shadow-red-600/20
                             border border-white/10
                             transition-all active:scale-[0.98]"
                >
                  <span className="relative z-10">Logout</span>
                  <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition bg-white/10" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Soft glow */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-sky-400/30 to-transparent" />
      </div>

      {/* Logout Confirmation Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onMouseDown={() => setShowConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Sign out?
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    You will be logged out of your account. You can sign back in
                    anytime.
                  </p>
                </div>

                <button
                  onClick={() => setShowConfirm(false)}
                  className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold
                             text-slate-700 bg-white hover:bg-slate-50
                             border border-slate-300 transition"
                >
                  Cancel
                </button>

                <button
                  onClick={onLogout}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white
                             bg-gradient-to-r from-rose-600 to-red-600
                             hover:from-rose-500 hover:to-red-500
                             border border-white/10
                             shadow-lg shadow-red-600/20
                             transition active:scale-[0.98]"
                >
                  Logout
                </button>
              </div>

              <p className="text-[11px] text-slate-500 mt-4">
                Tip: Press{" "}
                <span className="text-slate-900 font-semibold">ESC</span> to
                close.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
