import React, { useState } from "react";

type RegisterPageProps = {
  onRegister: (email: string) => void;
  onShowLogin: () => void;
};

export default function RegisterPage({
  onRegister,
  onShowLogin,
}: RegisterPageProps) {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [contact, setContact] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [error, setError] = useState<string>("");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (
      !name.trim() ||
      !email.trim() ||
      !contact.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setError("All fields are required.");
      return;
    }

    if (!/^\d{10}$/.test(contact.trim())) {
      setError("Contact number must be exactly 10 digits.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const users = JSON.parse(localStorage.getItem("users") || "[]");

    const exists = users.some(
      (u: any) => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (exists) {
      setError("An account with this email already exists.");
      return;
    }

    const newUser = {
      name: name.trim(),
      email: email.trim(),
      contact: contact.trim(),
      password,
    };

    localStorage.setItem("users", JSON.stringify([...users, newUser]));

    // ✅ after register go back to login
    onRegister(email.trim());
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#0b5cad]" />
          <div>
            <div className="text-base font-bold">
              Makoni’s Trade Intelligence
            </div>
            <div className="text-xs text-slate-500">Create an account</div>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700">
              Full Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none"
              placeholder="Enter full name"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="mt-1 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none"
              placeholder="Enter email"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">
              Contact
            </label>
            <input
              value={contact}
              onChange={(e) =>
                setContact(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              inputMode="numeric"
              maxLength={10}
              className="mt-1 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none"
              placeholder="Enter 10 digit number"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">
              Password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="mt-1 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none"
              placeholder="Enter password"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">
              Confirm Password
            </label>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              className="mt-1 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none"
              placeholder="Confirm password"
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
            Register
          </button>

          <div className="text-center text-xs text-slate-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onShowLogin}
              className="font-semibold text-[#0b5cad]"
            >
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
