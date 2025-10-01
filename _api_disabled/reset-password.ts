// /api/reset-password.ts
import 'dotenv/config'
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

  // ⇨ NEW: Hỗ trợ trường hợp body là string (Vercel/Fetch đôi khi truyền raw)
  const __parsed =
    typeof req.body === "string" ? JSON.parse(req.body || "{}") : null;

  const { token, newPassword } = (req.body || {}) as {
    token?: string;
    newPassword?: string;
  };

  // ⇨ NEW: Dùng giá trị đã parse nếu biến trên không có
  const _token = (token ?? __parsed?.token) as string | undefined;
  const _newPassword = (newPassword ?? __parsed?.newPassword) as
    | string
    | undefined;

  if (!_token || typeof _token !== "string") {
    return res.status(400).json({ error: "Thiếu token" });
  }
  if (!_newPassword || _newPassword.length < 6) {
    return res.status(400).json({ error: "Mật khẩu tối thiểu 6 ký tự" });
  }

  try {
    // Hash lại token từ link để so với DB
    const token_hash = crypto.createHash("sha256").update(_token).digest("hex");

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
    const password_hash = await bcrypt.hash(_newPassword, 10);

    // Cập nhật mật khẩu user (giữ nguyên logic gốc)
    const { error: upErr } = await supabase
      .from("users")
      .update({ password_hash })
      .eq("email", row.email);

    if (upErr) {
      console.error("update password error:", upErr);
      return res.status(500).json({ error: "Không cập nhật được mật khẩu" });
    }

    // ⇨ NEW (không phá logic cũ): Nếu có auth_user_id thì đổi mật khẩu ở Supabase Auth luôn
    try {
      const { data: urow } = await supabase
        .from("users")
        .select("auth_user_id")
        .eq("email", row.email)
        .maybeSingle();
      if (urow?.auth_user_id) {
        const { error: adminErr } = await supabase.auth.admin.updateUserById(
          urow.auth_user_id,
          { password: _newPassword }
        );
        if (adminErr) {
          console.warn("auth admin update password warn:", adminErr.message);
        }
      }
    } catch (e: any) {
      console.warn("auth admin update password catch:", e?.message || e);
    }

    // Đánh dấu token đã dùng
    await supabase
      .from("password_reset_tokens")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", row.id);

    // ⇨ NEW: Dọn token cũ cùng email (không bắt buộc)
    await supabase
      .from("password_reset_tokens")
      .delete()
      .eq("email", row.email)
      .neq("id", row.id);

    return res.status(200).json({ message: "Đổi mật khẩu thành công!" });
  } catch (e: any) {
    console.error("reset-password error:", e?.message || e);
    return res.status(500).json({ error: "Lỗi hệ thống" });
  }
}
