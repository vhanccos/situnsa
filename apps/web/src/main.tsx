import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app.js";
import "./index.css";

const el = document.getElementById("root");
if (!el) throw new Error("#root no encontrado");
createRoot(el).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
