// src/pages/ResetPassword.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";

const SUPPORT_EMAIL = "contact@emyland.vn";

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Nếu không có token → báo ngay để người dùng xin link mới
  useEffect(() => {
    if (!token) {
      setError("Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!password || !confirm) {
      setError("Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu tối thiểu 6 ký tự!");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu nhập lại không khớp!");
      return;
    }
    if (!token) {
      setError("Thiếu token hoặc token không hợp lệ!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccess("Đổi mật khẩu thành công! Đang chuyển sang trang đăng nhập...");
        // (THÊM) cập nhật thông báo + chuyển nhanh sang trang Đăng tin
        setSuccess("Đổi mật khẩu thành công! Đang chuyển sang trang đăng tin...");
        setTimeout(() => navigate("/post-property", { replace: true }), 800);

        setTimeout(() => navigate("/login", { replace: true }), 2000);
      } else {
        setError(data?.error || "Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.");
      }
    } catch {
      setError(`Không thể kết nối máy chủ. Cần hỗ trợ? ${SUPPORT_EMAIL}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <LockKeyhole className="h-7 w-7 text-blue-600" aria-hidden />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
              EmyLand
            </span>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">Tạo mật khẩu mới</CardTitle>
          <p className="text-gray-600 mt-2">
            Nhập mật khẩu mới cho tài khoản của bạn.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm" role="status">
                {success}
              </div>
            )}

            {/* New password */}
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-medium text-gray-700">
                Mật khẩu mới *
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Tối thiểu 6 ký tự. Tránh dùng mật khẩu quá đơn giản.
              </p>
            </div>

            {/* Confirm */}
            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">
                Nhập lại mật khẩu *
              </label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showPw2 ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw2((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPw2 ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPw2 ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              disabled={loading}
            >
              {loading ? "Đang đổi mật khẩu..." : "Xác nhận"}
            </Button>

            <div className="flex items-center justify-center gap-3 text-sm text-gray-600 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/login")}
                className="px-3"
              >
                Về trang Đăng nhập
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/forgot-password")}
                className="px-3 text-blue-600 hover:text-blue-700"
              >
                Yêu cầu liên kết mới
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
