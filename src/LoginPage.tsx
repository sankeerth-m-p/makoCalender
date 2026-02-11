import React, { useMemo, useState } from "react";

interface Session {
  username: string;
  token: string;
}

type LoginPageProps = {
  onLogin: (session: Session) => void;
  onShowRegister: () => void;
};

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const canSubmit = useMemo(() => {
    return username.trim().length > 0 && password.trim().length > 0 && !loading;
  }, [username, password, loading]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("https://backend-m7hv.onrender.com/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Login failed");
        return;
      }

      const data = await res.json();

      const session: Session = {
        username: data.username,
        token: data.token,
      };

      localStorage.setItem("makonis_session", JSON.stringify(session));
      onLogin(session);
    } catch (err) {
      setError("Server not reachable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f6f7fb]">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#0b5cad]/15 blur-3xl" />
        <div className="absolute top-40 -right-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-80 w-[38rem] rounded-full bg-slate-900/5 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0b5cad] to-indigo-600 shadow-sm">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div className="text-xl font-extrabold tracking-tight text-slate-900">
              Makoni’s Trade Intelligence
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Sign in to manage your events & calendar
            </div>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
            <div className="p-6 sm:p-7">
              <form onSubmit={submit} className="space-y-4">
                {/* Username */}
                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    Username
                  </label>

                  <div className="mt-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {/* user icon */}
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 21C20 18.7909 16.4183 17 12 17C7.58172 17 4 18.7909 4 21"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M12 14C14.7614 14 17 11.7614 17 9C17 6.23858 14.7614 4 12 4C9.23858 4 7 6.23858 7 9C7 11.7614 9.23858 14 12 14Z"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </span>

                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="off"
                      name="no-username"
                      className="h-12 w-full rounded-2xl border bg-white px-10 text-sm outline-none transition
                                 focus:border-[#0b5cad] focus:ring-4 focus:ring-[#0b5cad]/10"
                      placeholder="Enter username"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    Password
                  </label>

                  <div className="mt-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {/* lock icon */}
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M7 10V8C7 5.23858 9.23858 3 12 3C14.7614 3 17 5.23858 17 8V10"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M6 10H18C19.1046 10 20 10.8954 20 12V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V12C4 10.8954 4.89543 10 6 10Z"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </span>

                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPass ? "text" : "password"}
                      autoComplete="new-password"
                      name="no-password"
                      className="h-12 w-full rounded-2xl border bg-white px-10 pr-12 text-sm outline-none transition
                                 focus:border-[#0b5cad] focus:ring-4 focus:ring-[#0b5cad]/10"
                      placeholder="Enter password"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                    >
                      {showPass ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                {/* Button */}
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`h-12 w-full rounded-2xl text-sm font-semibold text-white transition
                    ${
                      canSubmit
                        ? "bg-gradient-to-r from-[#0b5cad] to-indigo-600 hover:brightness-110 shadow-sm"
                        : "bg-slate-300 cursor-not-allowed"
                    }`}
                >
                  {loading ? "Logging in..." : "Login"}
                </button>

                {/* Footer */}
                <div className="pt-2 text-center text-xs text-slate-500">
                  Secure login • Powered by Makonis
                </div>
              </form>
            </div>
          </div>

          {/* Bottom small text */}
          <div className="mt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Makoni’s Trade Intelligence
          </div>
        </div>
      </div>
    </div>
  );
}
