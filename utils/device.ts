export const isBrowser = typeof window !== "undefined";

const DEVICE_KEY = "emyland_device_id";

function genId(): string {
  try {
    // @ts-ignore
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      // @ts-ignore
      return crypto.randomUUID();
    }
  } catch {}
  return "dev-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getDeviceId(): string {
  if (!isBrowser) return "server";
  let id = localStorage.getItem(DEVICE_KEY) || "";
  if (!id) {
    id = genId();
    try { localStorage.setItem(DEVICE_KEY, id); } catch {}
  }
  return id;
}
