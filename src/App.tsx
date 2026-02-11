import Dashboard from "./pages/Dashboard";
import type { Session } from "./calendar/types";

interface AppProps {
  session: Session;
  onLogout: () => void;
}

export default function App({ session, onLogout }: AppProps) {
  return <Dashboard session={session} onLogout={onLogout} />;
}
