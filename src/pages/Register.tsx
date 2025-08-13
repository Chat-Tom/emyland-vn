// src/pages/Register.tsx
import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Building2 } from "lucide-react";

import { StorageManager } from "@utils/storage";
import { getOrCreateDeviceId } from "@utils/device";
import { useAuth } from "@/contexts/AuthContext";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { loginByPhone } = useAuth();

  const [form, setForm] = useState({
    phone: "",
    email: "",
    fullName: "",
    password: "",
    confirmPassword: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const sanitizePhone = (v: string) => v.replace(/\D/g, "");
  const isValidVNPhone = useCallback(
    (v: string) => /^(03|05|07|08|09)\d{8}$/.test(sanitizePhone(v)),
    []
  );
  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  // <<< CHUẨN HÓA SĐT: luôn giữ 0 đầu, tối đa 10 số (kể cả nhập +84...)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let v = value;

    if (name === "phone") {
      const digits = value.replace(/\D/g, "");
      let normalized = digits.startsWith("84") ? "0" + digits.slice(2) : digits;
      if (normalized.length > 0 && normalized[0] !== "0") {
        normalized = "0" + normalized;
      }
      v = normalized.slice(0, 10);
    }

    setForm((p) => ({ ...p, [name]: v }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
    if (errors.general) setErrors((p) => ({ ...p, general: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.phone) e.phone = "Số điện thoại là bắt buộc";
    else if (!isValidVNPhone(form.phone))
      e.phone = "Số điện thoại Việt Nam 10 số (đầu 03/05/07/08/09)";

    if (!form.email) e.email = "Email là bắt buộc";
    else if (!isValidEmail(form.email)) e.email = "Email không hợp lệ";

    if (!form.fullName) e.fullName = "Họ và tên là bắt buộc";

    if (!form.password) e.password = "Mật khẩu là bắt buộc";
    if (!form.confirmPassword) e.confirmPassword = "Xác nhận mật khẩu là bắt buộc";
    else if (form.password !== form.confirmPassword) e.confirmPassword = "Mật khẩu không khớp";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    setErrors((p) => ({ ...p, general: "" }));

    try {
      const phoneKey = sanitizePhone(form.phone); // đã chuẩn 0xxxxxxxxx

      // Chặn trùng trước khi gọi register
      if (StorageManager.getUserByPhone(phoneKey)) {
        setErrors({ general: "Số điện thoại đã được đăng ký" });
        return;
      }
      if (StorageManager.getUserByEmail(form.email)) {
        setErrors({ general: "Email đã được đăng ký" });
        return;
      }

      // Tạo payload đúng kiểu (không đưa các trường do register tự set)
      const payload = {
        id: StorageManager.generateId(),
        phone: phoneKey,
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        password: form.password,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isAdmin: false,
      };

      // Tạo user mới (register sẽ set currentUser & isLoggedIn)
      const newUser = StorageManager.register(payload as any);
      if (!newUser) {
        setErrors({ general: "Đăng ký thất bại (trùng thông tin hoặc dữ liệu không hợp lệ)." });
        return;
      }

      // Ghi nhớ thiết bị + tạo session auto-login
      const deviceId = getOrCreateDeviceId();
      StorageManager.markDeviceForUser(phoneKey, deviceId);
      StorageManager.setActiveSession({
        userId: newUser.id,
        phone: newUser.phone,
        deviceId,
        loggedInAt: new Date().toISOString(),
      });

      // Đồng bộ AuthContext (sau đó điều hướng)
      const ok = await loginByPhone(phoneKey, form.password);
      if (!ok) {
        setErrors({ general: "Không thể đăng nhập sau khi đăng ký. Vui lòng thử lại." });
        return;
      }

      navigate(newUser.isAdmin ? "/system-dashboard" : "/post-property", { replace: true });
    } catch {
      setErrors({ general: "Có lỗi xảy ra. Vui lòng thử lại." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-8 w-8 text-blue-600" aria-hidden />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
              EmyLand
            </span>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">Đăng ký tài khoản</CardTitle>
          <p className="text-gray-600 mt-2">
            Tạo tài khoản để đăng tin bất động sản miễn phí
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4" noValidate>
            {errors.general && (
              <div className="md:col-span-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errors.general}
              </div>
            )}

            {/* Phone */}
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Số điện thoại *
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="090xxxxxxx"
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                maxLength={10} // hạn chế tối đa 10 ký tự
              />
              <p className="text-xs text-gray-500">
                Chấp nhận số Việt Nam 10 số (đầu 03/05/07/08/09).
              </p>
              {errors.phone && (
                <p id="phone-error" className="text-red-500 text-sm">
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email *
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-red-500 text-sm">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Full name */}
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                Họ và tên *
              </label>
              <Input
                id="fullName"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
                aria-invalid={!!errors.fullName}
                aria-describedby={errors.fullName ? "fullName-error" : undefined}
              />
              {errors.fullName && (
                <p id="fullName-error" className="text-red-500 text-sm">
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Mật khẩu *
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Nhập mật khẩu"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
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
              {errors.password && (
                <p id="password-error" className="text-red-500 text-sm">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Xác nhận mật khẩu *
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPw2 ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Nhập lại mật khẩu"
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
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
              {errors.confirmPassword && (
                <p id="confirmPassword-error" className="text-red-500 text-sm">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit */}
            <div className="md:col-span-2">
              <Button
                type="submit"
                disabled={submitting}
                className="relative group w-full overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-orange-500 text-white font-semibold py-3 transition-transform duration-200 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 blur-sm"
                />
                <span className="relative">{submitting ? "Đang đăng ký..." : "Đăng ký"}</span>
              </Button>
            </div>

            <div className="md:col-span-2 text-center">
              <p className="text-gray-600">
                Đã có tài khoản?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="relative group inline-flex items-center px-2 py-1 rounded-md font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-md bg-blue-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  <span className="relative">Đăng nhập</span>
                </button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
