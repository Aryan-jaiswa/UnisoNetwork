import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./hooks/AuthContext";
import "./index.css";

const root = document.getElementById("root");

if (root) {
    createRoot(root).render(
        <React.StrictMode>
            <AuthProvider>
                <App />
            </AuthProvider>
        </React.StrictMode>
    );
} else {
    throw new Error("Root element not found");
}
