import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import GameUI from "./GameUI";

createRoot(document.getElementById("ui-root")!).render(
  <StrictMode>
    <GameUI />
  </StrictMode>
);
