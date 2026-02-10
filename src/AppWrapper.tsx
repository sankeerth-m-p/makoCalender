import React, { useState } from "react";
import App from "./App";
import LoginPage from "./LoginPage";

type Session = {
  username: string;
};

const AppWrapper: React.FC = () => {
  const [session, setSession] = useState<Session | null>(() => {
    const saved = localStorage.getItem("makonis_session");
    return saved ? (JSON.parse(saved) as Session) : null;
  });


  if (!session) {
    return <LoginPage onLogin={(user: Session) => setSession(user)} />;
  }

  return (
    <div>
      <App />
    </div>
  );
};

export default AppWrapper;
