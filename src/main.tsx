import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { App } from "./app/App";
import { AppUpdateNotice } from "./shared/components/AppUpdateNotice";
import "./styles/toastify-overrides.css";

const queryClient = new QueryClient();
const Router = import.meta.env.MODE === "github-pages" ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <App />
        <AppUpdateNotice />
        <ToastContainer
          position="bottom-right"
          autoClose={2400}
          hideProgressBar
          newestOnTop
          closeButton
          pauseOnFocusLoss={false}
          pauseOnHover
          draggable={false}
          theme="light"
        />
      </Router>
    </QueryClientProvider>
  </React.StrictMode>
);
