// Vercel Node Function: XÁC NHẬN token + đổi mật khẩu trong bảng users.password_hash
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { email, token, newPassword } = (req.body || {}) as {
    email?: string;
    token?: string;
    newPassword?: string;
  };

  if (!token || !newPassword || (newPassword?.length ?? 0) < 6) {
    return res.status(400).json({ error: "Dữ liệu không hợp lệ" });
  }

  try {
    const token_hash = crypto.createHash("sha256").update(token).digest("hex");

    // Tìm token hợp lệ
    const { data: tk, error: tkErr } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("token_hash", token_hash)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (tkErr || !tk) return res.status(400).json({ error: "Liên kết không hợp lệ hoặc đã hết hạn" });

    const targetEmail = (email || tk.email).toLowerCase();

    // Cập nhật mật khẩu
    const hash = await bcrypt.hash(newPassword, 10);
    const { error: upErr } = await supabase.from("users").update({ password_hash: hash }).eq("email", targetEmail);
    if (upErr) {
      console.error("update password error:", upErr);
      return res.status(500).json({ error: "Không cập nhật được mật khẩu" });
    }

    // Đánh dấu token đã dùng
    await supabase.from("password_reset_tokens").update({ used: true }).eq("id", tk.id);

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("reset-password error:", e?.message || e);
    return res.status(500).json({ error: "Lỗi hệ thống" });
  }
}
