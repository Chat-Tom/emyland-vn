// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

// Khởi tạo admin mặc định (idempotent)
import { StorageManager } from "@utils/storage";
try {
  StorageManager.initializeAdmin?.(); // chat301277@gmail.com / Chat@1221
} catch { /* no-op */ }

/* ======= ẢNH PLACEHOLDER: chặn via.placeholder.com toàn cục ======= */
(() => {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.__EMYLAND_IMG_PATCHED__) return; // tránh patch 2 lần khi HMR/StrictMode
  w.__EMYLAND_IMG_PATCHED__ = true;

  const FALLBACK_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 675'>
    <defs><linearGradient id='g' x1='0' x2='1'>
      <stop stop-color='#2563eb'/><stop offset='1' stop-color='#f97316'/></linearGradient></defs>
    <rect width='1200' height='675' fill='url(#g)'/>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
      fill='white' font-family='Arial,Helvetica,sans-serif' font-size='44'>EmyLand</text>
  </svg>`;
  const PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(FALLBACK_SVG)}`;
  const BAD_HOST_RE = /(^|\/\/)via\.placeholder\.com/i;

  const normalize = (src: string) => (BAD_HOST_RE.test(src) ? PLACEHOLDER : src);

  // 1) Patch setter img.src
  const proto = HTMLImageElement.prototype as any;
  const desc = Object.getOwnPropertyDescriptor(proto, "src");
  if (desc?.set && desc?.get) {
    Object.defineProperty(proto, "src", {
      configurable: true,
      enumerable: desc.enumerable ?? true,
      get() {
        return desc.get!.call(this);
      },
      set(value: string) {
        return desc.set!.call(this, normalize(String(value ?? "")));
      },
    });
  }

  // 2) Patch setAttribute('src', ...)
  const origSetAttr = proto.setAttribute;
  proto.setAttribute = function (name: string, value: any) {
    if (String(name).toLowerCase() === "src") {
      return origSetAttr.call(this, name, normalize(String(value ?? "")));
    }
    return origSetAttr.call(this, name, value);
  };

  // 3) Fallback onerror → thay thế ảnh xấu nếu vẫn lọt
  const onErr = (e: Event) => {
    const t = e.target as any;
    if (t instanceof HTMLImageElement && t.src !== PLACEHOLDER) t.src = PLACEHOLDER;
  };
  document.addEventListener("error", onErr, true);

  // 4) Quét ảnh hiện có trên DOM
  const swap = () => Array.from(document.images).forEach((img) => {
    if (BAD_HOST_RE.test(img.src)) img.src = PLACEHOLDER;
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", swap, { once: true });
  } else {
    swap();
  }
})();
/* ================================================================== */

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
