import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { AuthGate } from "./auth/AuthGate";
import { StoreProvider } from "./store/StoreProvider";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AuthGate>
          <StoreProvider>
            <App />
          </StoreProvider>
        </AuthGate>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
