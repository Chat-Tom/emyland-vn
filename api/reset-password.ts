// src/pages/api/reset-password.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// >>> Added: đảm bảo chạy Node runtime
export const config = { runtime: "nodejs" };

// >>> Added: shim EMAIL_* <-> SMTP_*
(() => {
  const map: [keyof NodeJS.ProcessEnv, keyof NodeJS.ProcessEnv][] = [
    ["SMTP_HOST", "EMAIL_HOST"],
    ["SMTP_PORT", "EMAIL_PORT"],
    ["SMTP_USER", "EMAIL_USER"],
    ["SMTP_PASS", "EMAIL_PASS"],
    ["SMTP_FROM", "EMAIL_FROM"],
  ];
  for (const [dst, src] of map) {
    if (!process.env[dst] && process.env[src]) (process.env as any)[dst] = process.env[src]!;
    if (!process.env[src] && process.env[dst]) (process.env as any)[src] = process.env[dst]!;
  }
  if (!process.env.SMTP_HOST) (process.env as any).SMTP_HOST = "smtp.gmail.com";
  if (!process.env.SMTP_PORT) (process.env as any).SMTP_PORT = "465";
  if (!process.env.SMTP_FROM && process.env.SMTP_USER) {
    (process.env as any).SMTP_FROM = `EmyLand <${process.env.SMTP_USER}>`;
  }
})();

// Reuse supabase admin (service role)
const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!supabase) return res.status(500).json({ error: "Server is not configured" });

  const { token, newPassword } = (req.body || {}) as { token?: string; newPassword?: string };

  if (!token) return res.status(400).json({ error: "Thiếu token" });
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: "Mật khẩu tối thiểu 6 ký tự" });

  try {
    // >>> IMPORTANT: Hash token theo đúng chuẩn đã lưu (sha256 HEX)
    const tokenHashHex = crypto.createHash("sha256").update(token).digest("hex");

    // Tìm bản ghi token còn hạn & chưa dùng
    const { data: tok, error: tokErr } = await supabase
      .from("password_reset_tokens")
      .select("id,email,expires_at,used")
      .eq("token_hash", tokenHashHex)
      .maybeSingle();

    if (tokErr) {
      console.error("lookup token error:", tokErr);
      return res.status(500).json({ error: "Lỗi hệ thống" });
    }
    if (!tok || tok.used || new Date(tok.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: "Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới." });
    }

    // --- Đổi mật khẩu:
    // Giữ nguyên cách Tom đang làm. Nếu trước đây Tom hash bằng bcrypt ở Node thì vẫn ok.
    // Nếu Tom dùng cột password_hash trong bảng users, chỉ cần update thẳng (đã có hash phía ngoài).
    // Ở đây mình hash bằng bcryptjs-compat nếu project đã có sẵn; nếu Tom đang hash ở nơi khác, có thể thay đoạn này bằng cách cũ.
    let password_hash: string | undefined = undefined;
    try {
      // Không ép buộc cài thêm package; nếu đã có bcryptjs thì dùng, còn không Tom giữ lại cách cũ trong dự án.
      // @ts-ignore - optional require
      const bcrypt = await import("bcryptjs").catch(() => null);
      if (bcrypt?.hashSync) {
        const rounds = parseInt(process.env.BCRYPT_ROUNDS || "10", 10);
        password_hash = bcrypt.hashSync(newPassword, rounds);
      }
    } catch (e) {
      // Nếu không có bcryptjs, Tom hãy dùng flow hash cũ (VD: RPC hoặc SQL crypt()).
      password_hash = undefined;
    }

    if (password_hash) {
      const { error: upErr } = await supabase
        .from("users")
        .update({ password_hash, updated_at: new Date().toISOString() })
        .eq("email", tok.email);

      if (upErr) {
        console.error("update password error:", upErr);
        return res.status(500).json({ error: "Không cập nhật được mật khẩu" });
      }
    } else {
      // Fallback: Nếu dự án của Tom đang dùng pgcrypto/crypt() ở DB, hãy dùng hàm RPC có sẵn (nếu đã tạo),
      // ví dụ: set_user_password(email, new_password) – GIỮ CÁCH CŨ nếu Tom đã có.
      // ---- Ví dụ giữ nguyên nếu Tom đã có RPC:
      // const { error: rpcErr } = await supabase.rpc("set_user_password", { p_email: tok.email, p_new_password: newPassword });
      // if (rpcErr) { console.error(rpcErr); return res.status(500).json({ error: "Không cập nhật được mật khẩu" }); }
      return res.status(500).json({
        error:
          "Thiếu cơ chế hash mật khẩu ở server. Vui lòng cài 'bcryptjs' hoặc dùng RPC/SQL crypt() như flow cũ để cập nhật password.",
      });
    }

    // Đánh dấu token đã dùng (idempotent)
    await supabase
      .from("password_reset_tokens")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", tok.id);

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("reset-password error:", e?.message || e);
    return res.status(500).json({ error: "Lỗi hệ thống" });
  }
}
