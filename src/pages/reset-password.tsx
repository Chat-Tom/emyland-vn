// src/pages/ResetPassword.tsx
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button"; // dùng alias @ để đồng bộ dự án

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

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

      const data = await res.json();
      if (res.ok) {
        setSuccess("Đổi mật khẩu thành công! Đang chuyển sang trang đăng nhập...");
        setTimeout(() => navigate("/login", { replace: true }), 2000);
      } else {
        setError(data?.error || "Lỗi không xác định");
      }
    } catch {
      setError("Không thể kết nối máy chủ!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-xl p-8 rounded-2xl w-full max-w-md space-y-4"
        noValidate
      >
        <h2 className="text-2xl font-bold text-center mb-4">Tạo mật khẩu mới</h2>

        {error && <div className="text-red-600 bg-red-50 p-2 rounded" role="alert">{error}</div>}
        {success && <div className="text-green-600 bg-green-50 p-2 rounded" role="status">{success}</div>}

        <div>
          <label htmlFor="new-password" className="block text-gray-700 mb-1">
            Mật khẩu mới
          </label>
          <input
            id="new-password"
            type="password"
            className="w-full border rounded p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu mới"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-gray-700 mb-1">
            Nhập lại mật khẩu
          </label>
          <input
            id="confirm-password"
            type="password"
            className="w-full border rounded p-2"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Nhập lại mật khẩu"
            disabled={loading}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Đang đổi mật khẩu..." : "Xác nhận"}
        </Button>
      </form>
    </div>
  );
};

export default ResetPassword;
