import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useIdentifierAvailability(identifier: string) {
  const [formatError, setFormatError] = useState("");
  const [exists, setExists] = useState(false);
  const [dupMessage, setDupMessage] = useState("");

  const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const sanitizePhone = (v: string) => v.replace(/\D/g, "");
  const normalizeVNPhone = (input: string) => {
    const digits = sanitizePhone(input);
    let normalized = digits.startsWith("84") ? "0" + digits.slice(2) : digits;
    if (normalized.length > 0 && normalized[0] !== "0") normalized = "0" + normalized;
    return normalized.slice(0, 10);
  };
  const isValidVNPhone = (v: string) => /^(03|05|07|08|09)\d{8}$/.test(sanitizePhone(v));

  const mode: "email" | "phone" = useMemo(
    () => (isEmail(identifier) ? "email" : "phone"),
    [identifier]
  );

  useEffect(() => {
    const v = identifier.trim();
    // Kiểm tra định dạng ngay
    if (!v) { setFormatError(""); setExists(false); setDupMessage(""); return; }
    if (mode === "email") setFormatError(isEmail(v) ? "" : "Email không hợp lệ");
    else setFormatError(isValidVNPhone(normalizeVNPhone(v)) ? "" : "Số điện thoại Việt Nam 10 số (đầu 03/05/07/08/09)");

    if (!v || (mode === "email" && !isEmail(v)) || (mode === "phone" && !isValidVNPhone(normalizeVNPhone(v)))) {
      setExists(false); setDupMessage(""); return;
    }

    let alive = true;
    const id = isEmail(v) ? v : normalizeVNPhone(v);
    const email = isEmail(id) ? id : null;
    const phone = !email ? sanitizePhone(id) : null;

    const t = setTimeout(async () => {
      async function tryRpc(name: string, args: Record<string, any>) {
        try { const { data, error } = await supabase.rpc(name as any, args as any); if (!error) return data; } catch {}
        return null;
      }

      let data: any = await tryRpc("rpc_check_identifier", { p_email: email, p_phone: phone });
      if (data == null) data = await tryRpc("rpc_exists_identifier", { p_email: email, p_phone: phone });
      if (data == null) data = await tryRpc("rpc_lookup_user", { p_email_or_phone: email ?? phone });

      let exists = false, dup = false;
      if (Array.isArray(data)) {
        const row = data[0] ?? {};
        const cnt = row.count ?? row.c ?? row.total ?? row.n ?? (typeof row === "number" ? row : undefined);
        if (typeof cnt === "number") { exists = cnt > 0; dup = cnt > 1; }
        else {
          exists = !!(row.exists ?? row.is_exist ?? row.found);
          dup = !!(row.duplicated ?? row.dup ?? row.is_dup) || (typeof row.dup_count === "number" && row.dup_count > 1);
        }
      } else if (typeof data === "number") { exists = data > 0; dup = data > 1; }

      if (data == null) {
        try {
          const col = email ? "email" : "phone";
          const val = email ?? phone!;
          const { count, error } = await supabase.from("users_public").select("id", { count: "exact", head: true }).eq(col, val);
          if (!error && typeof count === "number") { exists = count > 0; dup = count > 1; }
        } catch {}
      }

      if (!alive) return;
      setExists(exists);
      setDupMessage(dup ? "Thông tin này đang trùng nhiều tài khoản trên hệ thống. Vui lòng liên hệ hỗ trợ." : "");
    }, 450);

    return () => { alive = false; clearTimeout(t); };
  }, [identifier, mode]);

  return { mode, formatError, exists, dupMessage };
}
