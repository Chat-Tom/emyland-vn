
cat > utils/log.ts <<'TS'
/** Lightweight change-log for user & property actions (localStorage) */
export type LogTarget = "user" | "property" | "system";
export type LogAction =
  | "create"
  | "update"
  | "delete"
  | "verify"
  | "unverify"
  | "login"
  | "logout"
  | "role_change"
  | "other";

export interface ChangeLog {
  id: string;
  at: string;               // ISO time
  actorEmail?: string;      // who performed the action
  target: LogTarget;        // user | property | system
  targetId?: string;        // email (user) hoặc id (property)
  action: LogAction;
  summary: string;          // human friendly
  diff?: any;               // optional details
}

const KEY = "emyland_logs";
const MAX_LOGS = 2000;

export const genId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function getLogs(): ChangeLog[] {
  try {
    const raw = localStorage.getItem(KEY) || "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function clearLogs() {
  try { localStorage.removeItem(KEY); } catch {}
  try { window.dispatchEvent(new CustomEvent("emyland:logs-changed")); } catch {}
}

export function appendLog(partial: Partial<ChangeLog>): ChangeLog {
  const entry: ChangeLog = {
    id: genId(),
    at: new Date().toISOString(),
    action: "other",
    target: "system",
    summary: "",
    ...partial,
  };
  const arr = [entry, ...getLogs()].slice(0, MAX_LOGS);
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch {}
  try { window.dispatchEvent(new CustomEvent("emyland:logs-changed")); } catch {}
  return entry;
}

/** Lấy email actor từ StorageManager (nếu truyền) hoặc từ local */
export function getActorEmail(StorageManager?: any): string | undefined {
  try {
    const cur = StorageManager?.getCurrentUser?.();
    if (cur?.email) return cur.email;
  } catch {}
  try {
    const sessionRaw = localStorage.getItem("emyland_active_session");
    const s = sessionRaw ? JSON.parse(sessionRaw) : null;
    return s?.email || undefined;
  } catch {}
  return undefined;
}
TS
