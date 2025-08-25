// /api/reset-password.ts
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

// Đảm bảo chạy Node runtime
export const config = { runtime: "nodejs" };

// Supabase service role (bỏ qua RLS)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token, newPassword } = (req.body || {}) as {
    token?: string;
    newPassword?: string;
  };

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Thiếu token" });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "Mật khẩu tối thiểu 6 ký tự" });
  }

  try {
    // Hash lại token từ link để so với DB
    const token_hash = crypto.createHash("sha256").update(token).digest("hex");

    // Tìm token còn hạn & chưa dùng
    const { data: row, error } = await supabase
      .from("password_reset_tokens")
      .select("id, email, used, expires_at")
      .eq("token_hash", token_hash)
      .maybeSingle();

    if (error) {
      console.error("query token error:", error);
      return res.status(500).json({ error: "Lỗi hệ thống" });
    }

    const now = Date.now();
    if (!row || row.used || new Date(row.expires_at).getTime() <= now) {
      return res
        .status(400)
        .json({
          error:
            "Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.",
        });
    }

    // Băm mật khẩu bằng bcryptjs (12 rounds tuỳ nhu cầu)
    const password_hash = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu user
    const { error: upErr } = await supabase
      .from("users")
      .update({ password_hash })
      .eq("email", row.email);

    if (upErr) {
      console.error("update password error:", upErr);
      return res.status(500).json({ error: "Không cập nhật được mật khẩu" });
    }

    // Đánh dấu token đã dùng
    await supabase
      .from("password_reset_tokens")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", row.id);

    return res.status(200).json({ message: "Đổi mật khẩu thành công!" });
  } catch (e: any) {
    console.error("reset-password error:", e?.message || e);
    return res.status(500).json({ error: "Lỗi hệ thống" });
  }
}
