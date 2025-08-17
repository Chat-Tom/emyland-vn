// src/pages/ForgotPassword.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Mail } from "lucide-react";
import { StorageManager } from "@utils/storage";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

const SUPPORT_EMAIL = "contact@emyland.vn";

const ForgotPassword: React.FC = () => {
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Prefill từ ?email=
  useEffect(() => {
    const seed = sp.get("email") || "";
    if (seed) setEmail(seed);
  }, [sp]);

  // Tìm user theo email (không phân biệt hoa/thường)
  const userExists = useMemo(() => {
    if (!email) return false;
    const norm = email.trim();
    if (!isValidEmail(norm)) return false;
    const direct = StorageManager.getUserByEmail(norm);
    if (direct) return true;
    const low = norm.toLowerCase();
    return StorageManager.getAllUsers().some(
      (u) => (u.email || "").toLowerCase() === low
    );
  }, [email]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    const norm = email.trim();
    if (!norm) {
      setErr("Vui lòng nhập Email đã đăng ký.");
      return;
    }
    if (!isValidEmail(norm)) {
      setErr("Email không hợp lệ.");
      return;
    }
    if (!userExists) {
      setErr("Email chưa được đăng ký. Vui lòng nhập đúng Email trong tài khoản.");
      return;
    }

    try {
      setSubmitting(true);
      const r = await fetch("/api/send-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: norm }),
      });

      if (!r.ok) {
        // cố gắng lấy thông báo lỗi từ server
        let detail = "";
        try {
          const d = await r.json();
          detail = d?.error ? ` (${d.error})` : "";
        } catch {}
        throw new Error(detail);
      }

      setMsg("Đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (và Spam/Junk nếu chưa thấy).");
    } catch {
      setErr(`Không gửi được email khôi phục. Cần hỗ trợ? Liên hệ ${SUPPORT_EMAIL}.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-8 w-8 text-blue-600" aria-hidden />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
              EmyLand
            </span>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">Quên mật khẩu</CardTitle>
          <p className="text-gray-600 mt-2">
            Nhập <b>email đã đăng ký</b> để nhận liên kết đặt lại mật khẩu.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {msg && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {msg}
              </div>
            )}
            {err && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {err}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email đã đăng ký *
              </label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (msg) setMsg(null);
                    if (err) setErr(null);
                  }}
                  placeholder="you@example.com"
                  aria-invalid={!!err}
                  className="pr-10"
                />
                <Mail className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-xs text-gray-500">
                Hệ thống chỉ gửi về <b>email đã đăng ký trong tài khoản</b>. Không chấp nhận email khác.
              </p>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="relative group w-full overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-orange-500 text-white font-semibold py-3 transition-transform duration-200 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 blur-sm"
              />
              <span className="relative">{submitting ? "Đang gửi…" : "Gửi liên kết đặt lại"}</span>
            </Button>

            <div className="text-center text-sm text-gray-600">
              Không nhận được email? Kiểm tra thư mục Spam hoặc liên hệ{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 hover:text-blue-700 underline">
                {SUPPORT_EMAIL}
              </a>.
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/login")}
                className="px-4"
              >
                Quay lại Đăng nhập
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/register")}
                className="px-4 text-blue-600 hover:text-blue-700"
              >
                Tạo tài khoản mới
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
