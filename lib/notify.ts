import { toast, type ToastOptions } from "react-toastify";

const defaults: ToastOptions = {
  position: "top-center",
  autoClose: 5200,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

export function notifySuccess(message: string) {
  toast.success(message, defaults);
}

export function notifyError(message: string) {
  toast.error(message, { ...defaults, autoClose: 8000 });
}

export function notifyInfo(message: string) {
  toast.info(message, defaults);
}

/** Same shape as legacy inline banners (ok / err). */
export function notify(payload: { type: "ok" | "err"; text: string }) {
  if (payload.type === "ok") notifySuccess(payload.text);
  else notifyError(payload.text);
}
