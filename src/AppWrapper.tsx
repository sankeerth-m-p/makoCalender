import React, { useState } from "react";
import App from "./App";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";

export type Session = {
  username: string;
  token: string;
};

const AppWrapper: React.FC = () => {
  const [session, setSession] = useState<Session | null>(() => {
    const saved = localStorage.getItem("makonis_session");
    return saved ? (JSON.parse(saved) as Session) : null;
  });

  const [showRegister, setShowRegister] = useState<boolean>(false);

  function handleLogin(newSession: Session) {
    setSession(newSession);
  }

  function handleRegister() {
    setShowRegister(false);
  }

  function handleLogout() {
    localStorage.removeItem("makonis_session");
    setSession(null);
  }

  // ✅ Show login/register screens if session not present
  if (!session) {
    if (showRegister) {
      return (
        <RegisterPage
          onRegister={handleRegister}
          onShowLogin={() => setShowRegister(false)}
        />
      );
    }

    return (
      <LoginPage
        onLogin={handleLogin}
        onShowRegister={() => setShowRegister(true)}
      />
    );
  }

  // ✅ After login show main App
  return <App session={session} onLogout={handleLogout} />;
};

export default AppWrapper;
