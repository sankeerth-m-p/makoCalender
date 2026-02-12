import { useState } from "react";
import type { Session } from "../calendar/types";

interface TopBarProps {
  session: Session;
  onLogout: () => void;
}

export default function TopBar({ session, onLogout }: TopBarProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      {/* Top Bar */}
      <div className="bg-slate-700 border-b border-slate-600 px-6 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-xl font-semibold text-white tracking-tight">
            makoCalendar
          </h1>

          <div className="flex items-center gap-4">
            <span className="text-slate-300 text-sm">
              {session.username}
            </span>

            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              Sign out?
            </h2>

            <p className="text-sm text-slate-600 mb-6">
              You will be logged out of your account. You can sign back in anytime.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-md text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                onClick={onLogout}
                className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
