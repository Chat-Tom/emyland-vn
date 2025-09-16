import { supabase } from "@/lib/supabase";

const SIBLINGS = [
  "https://emyland.vn",
  "https://nhadat.ai.vn",
  "https://www.nhadat.ai.vn",
];

// 1) Xử lý khi trang hiện tại là /auth/sync (nhận token từ domain anh em)
(async () => {
  const path = window.location.pathname;
  if (path.startsWith("/auth/sync")) {
    const q = new URLSearchParams(window.location.search);
    const logout = q.get("logout");
    const access_token  = q.get("access_token") || "";
    const refresh_token = q.get("refresh_token") || "";

    try {
      if (logout === "1") {
        await supabase.auth.signOut();
      } else if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    } catch (_e) { /* noop */ }
    // Xoá token khỏi URL rồi quay về home
    window.history.replaceState({}, "", "/");
    window.location.replace("/");
  }
})();

// 2) Khi SIGNED_IN ở domain A -> mở tab nền đồng bộ sang các domain còn lại
supabase.auth.onAuthStateChange(async (event, session) => {
  try {
    if (event === "SIGNED_IN" && session?.access_token && session?.refresh_token) {
      const me = window.location.origin;
      for (const host of SIBLINGS) {
        if (host !== me) {
          window.open(
            `${host}/auth/sync?access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}`,
            "_blank",
            "noopener,noreferrer"
          );
        }
      }
    }
    // (tuỳ chọn) Khi SIGNED_OUT ở 1 nơi -> signout chéo
    if (event === "SIGNED_OUT") {
      const me = window.location.origin;
      for (const host of SIBLINGS) {
        if (host !== me) {
          window.open(`${host}/auth/sync?logout=1`, "_blank", "noopener,noreferrer");
        }
      }
    }
  } catch (_e) { /* noop */ }
});
