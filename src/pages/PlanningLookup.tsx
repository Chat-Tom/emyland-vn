// src/pages/PlanningLookup.tsx
import React, { useEffect, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getOrCreateDeviceId } from "@utils/device";

const DEFAULT_PLANNING_URL =
  import.meta.env.VITE_PLANNING_EXTERNAL_URL ||
  "https://beta.meeymap.com/tra-cuu-quy-hoach/d-tran-duy-hungngo-174-phong-403?search=eyJsYXQiOjIxLjAwNjMwNzEwMjkxNTg5OCwibG5nIjoxMDUuNzk1OTkxMzk5MDg5NzYsInRhYiI6MSwic2F0ZWxsaXRlVmlzaWJsZSI6dHJ1ZSwiaW1hZ2UiOiIvaW1hZ2VzL3Nlby1kZWZhdWx0LTIucG5nIn0";

function getTargetUrl(searchParams: URLSearchParams): string {
  const override = (searchParams.get("url") || "").trim();
  if (override && /^https?:\/\//i.test(override)) return override;
  return DEFAULT_PLANNING_URL;
}

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
    /* silent */
  }
}

export default function PlanningLookup() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const openInNewTab = useCallback((url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const openExternal = useCallback(
    async (reason: "auto" | "manual" | "link") => {
      const targetUrl = getTargetUrl(searchParams);

      await logPlanningClick({
        reason,
        path: location.pathname,
        query: location.search,
        referrer: document.referrer || null,
        ua: navigator.userAgent,
        targetUrl,
      });

      try {
        (window as any).gtag?.("event", "planning_lookup_click", {
          event_category: "planning",
          event_label: reason,
        });
      } catch {}

      openInNewTab(targetUrl); // luôn mở tab mới, không fallback same-tab
    },
    [location.pathname, location.search, searchParams, openInNewTab]
  );

  useEffect(() => {
    const openParam = searchParams.get("open");
    const shouldOpen = openParam === "1" || openParam === null;

    const KEY = "planning_lookup_last_open_ts";
    const now = Date.now();
    const last = Number(localStorage.getItem(KEY) || 0);
    const allow = now - last > 60_000;

    if (shouldOpen && allow) {
      localStorage.setItem(KEY, String(now));
      setTimeout(() => void openExternal("auto"), 0);
    }
  }, [searchParams, openExternal]);

  const targetUrl = getTargetUrl(searchParams);

  return (
    <div className="mx-auto max-w-4xl py-16 px-4">
      <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-3xl">
          🗺️
        </div>
        <h1 className="text-3xl font-bold mb-6">Tra cứu quy hoạch</h1>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => void openExternal("manual")}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 border hover:bg-accent transition"
          >
            Mở bản đồ quy hoạch
          </button>

          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 bg-blue-600 text-white hover:opacity-90 transition"
            onClick={() => void logPlanningClick({ reason: "link", via: "anchor" })}
          >
            Mở qua liên kết dự phòng
          </a>
        </div>
      </div>
    </div>
  );
}
