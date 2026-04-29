"use client";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function AppToaster() {
  return (
    <ToastContainer
      position="top-center"
      style={{
        top: "max(1rem, env(safe-area-inset-top), var(--tg-safe-area-inset-top, 0px))",
      }}
      autoClose={5200}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
      limit={4}
    />
  );
}
