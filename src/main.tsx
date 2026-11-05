import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/light-theme.css";
import App from "./App";
import { readDarkPreference } from "./lib/theme";

// Apply the stored preference before React paints; first visit defaults to dark.
if (readDarkPreference()) {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
