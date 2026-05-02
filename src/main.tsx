import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { App } from "./app/App";
import "./styles/toastify-overrides.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
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
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
