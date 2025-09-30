// src/pages/PlanningLookup.tsx
import React, { useEffect, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getOrCreateDeviceId } from "@utils/device";

const PLANNING_URL =
  import.meta.env.VITE_PLANNING_EXTERNAL_URL ||
  "https://beta.meeymap.com/tra-cuu-quy-hoach/d-tran-duy-hungngo-174-phong-403?search=eyJsYXQiOjIxLjAwNjMwNzEwMjkxNTg5OCwibG5nIjoxMDUuNzk1OTkxMzk5MDg5NzYsInRhYiI6MSwic2F0ZWxsaXRlVmlzaWJsZSI6dHJ1ZSwiaW1hZ2UiOiIvaW1hZ2VzL3Nlby1kZWZhdWx0LTIucG5nIn0";

/** Ghi 1 event analytics an toàn, không chặn UI nếu lỗi */
async function logPlanningClick(meta: Record<string, any> = {}) {
  try {
    const device_id =
      typeof getOrCreateDeviceId === "function" ? getOrCreateDeviceId() : null;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("analytics_events").insert([
      {
        event: "planning_lookup_click",
        device_id,
        user_id: user?.id ?? null,
        meta,
      },
    ]);
  } catch {
    // im lặng nếu ghi log thất bại
  }
}

export default function PlanningLookup() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const openExternal = useCallback(
    async (reason: "auto" | "manual") => {
      await logPlanningClick({
        reason,
        path: location.pathname,
        query: location.search,
        referrer: document.referrer || null,
        ua: navigator.userAgent,
      });

      // GA (nếu đã cài gtag)
      try {
        (window as any).gtag?.("event", "planning_lookup_click", {
          event_category: "planning",
          event_label: reason,
        });
      } catch {
        /* ignore */
      }

      // Mở tab ngoài; nếu bị chặn popup → fallback mở ngay trong cùng tab
      try {
        const newWin = window.open(
          PLANNING_URL,
          "_blank",
          "noopener,noreferrer"
        );
        if (!newWin || newWin.closed) {
          window.location.href = PLANNING_URL; // fallback same-tab
        }
      } catch {
        window.location.href = PLANNING_URL; // fallback an toàn
      }
    },
    [location.pathname, location.search]
  );

  useEffect(() => {
    const shouldOpen = searchParams.get("open") === "1";

    // Chống mở lặp khi F5: throttle 60s
    const KEY = "planning_lookup_last_open_ts";
    const now = Date.now();
    const last = Number(localStorage.getItem(KEY) || 0);
    const allow = now - last > 60_000;

    if (shouldOpen && allow) {
      localStorage.setItem(KEY, String(now));
      void openExternal("auto");
    }
  }, [searchParams, openExternal]);

  return (
    <div className="mx-auto max-w-4xl py-16 px-4">
      <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-3xl">
          🚧
        </div>
        <h1 className="text-3xl font-bold mb-3">Tra cứu quy hoạch</h1>
        <p className="text-muted-foreground mb-6">
          Tính năng đang hoàn thiện. Hệ thống sẽ mở bản đồ quy hoạch ở tab mới.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => void openExternal("manual")}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 border hover:bg-accent transition"
          >
            Mở lại bản đồ quy hoạch
          </button>

          <a
            href={PLANNING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 bg-blue-600 text-white hover:opacity-90 transition"
            onClick={() => void logPlanningClick({ reason: "link" })}
          >
            Mở qua liên kết dự phòng
          </a>
        </div>
      </div>
    </div>
  );
}
