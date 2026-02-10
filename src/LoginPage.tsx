import React, { useState, FormEvent, ChangeEvent } from "react";




interface Session {
  username: string;
  token: string;
}

type LoginPageProps = {
  onLogin: (session: Session) => void;
};

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");

   async function submit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
   e.preventDefault();
   setError("");
 
   try {
     const res = await fetch("http://127.0.0.1:5000/auth/login", {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
       },
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
   }
 }

  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#0b5cad]" />
          <div>
            <div className="text-base font-bold">
              Makoni’s Trade Intelligence
            </div>
            <div className="text-xs text-slate-500">Login to continue</div>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700">
              Username
            </label>
            <input
              value={username}
              onChange={handleUsernameChange}
              autoComplete="off"
              name="no-username"
              className="mt-1 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">
              Password
            </label>
            <input
              value={password}
              onChange={handlePasswordChange}
              type="password"
              autoComplete="new-password"
              name="no-password"
              className="mt-1 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="h-11 w-full rounded-xl bg-[#0b5cad] text-sm font-semibold text-white"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
