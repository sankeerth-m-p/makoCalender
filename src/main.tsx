import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import AppWrapper from "./AppWrapper";

// ✅ Toast
import { Toaster } from "react-hot-toast";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    {/* ✅ Toast position top-right */}
    <Toaster position="top-right" reverseOrder={false} />
    <AppWrapper />
  </StrictMode>
);
