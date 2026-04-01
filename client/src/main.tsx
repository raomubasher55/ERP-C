import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "@radix-ui/themes/styles.css";
import App from "./App.tsx";
import { Theme } from "@radix-ui/themes";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme accentColor="teal" grayColor="sage" radius="large" scaling="105%">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Theme>
  </StrictMode>
)
