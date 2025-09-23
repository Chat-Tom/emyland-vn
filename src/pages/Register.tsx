// src/pages/Register.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Building2 } from "lucide-react";

import { StorageManager } from "@utils/storage";
import { getOrCreateDeviceId } from "@utils/device";
import { useAuth } from "@/contexts/AuthContext";
import { phoneExists, emailExists } from "@/lib/uniqueness";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { loginByPhone } = useAuth();

  // Luôn về trang Đăng tin miễn phí sau khi đăng ký
  const NEXT_AFTER_REGISTER = "/post-property";

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

  // trạng thái kiểm tra trùng realtime
  const [checking, setChecking] = useState({ phone: false, email: false });
  const [dup, setDup] = useState({ phone: false, email: false });
  const [dupMsg, setDupMsg] = useState({ phone: "", email: "" });

  const sanitizePhone = (v: string) => v.replace(/\D/g, "");
  const isValidVNEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const isValidVNPhone = useCallback(
    (v: string) => /^(03|05|07|08|09)\d{8}$/.test(sanitizePhone(v)),
    []
  );

  // validate định dạng realtime
  const phoneError = useMemo(() => {
    if (!form.phone.trim()) return "";
    return isValidVNPhone(form.phone)
      ? ""
      : "Số điện thoại Việt Nam 10 số (đầu 03/05/07/08/09)";
  }, [form.phone, isValidVNPhone]);

  const emailError = useMemo(() => {
    if (!form.email.trim()) return "";
    return isValidVNEmail(form.email) ? "" : "Email không hợp lệ";
  }, [form.email]);

  const passwordHint = useMemo(() => {
    if (!form.password) return "";
    return form.password.length >= 6 ? "" : "Mật khẩu tối thiểu 6 ký tự";
  }, [form.password]);

  const confirmHint = useMemo(() => {
    if (!form.confirmPassword) return "";
    return form.confirmPassword === form.password ? "" : "Mật khẩu không khớp";
  }, [form.confirmPassword, form.password]);

  const canSubmit = useMemo(() => {
    const requiredOk =
      form.phone.trim() &&
      form.email.trim() &&
      form.fullName.trim() &&
      form.password &&
      form.confirmPassword;
    const noRealtimeErrors =
      !phoneError && !emailError && !passwordHint && !confirmHint;
    const noDupAndNotChecking =
      !dup.phone && !dup.email && !checking.phone && !checking.email;
    return !!requiredOk && noRealtimeErrors && noDupAndNotChecking && !submitting;
  }, [
    form.phone,
    form.email,
    form.fullName,
    form.password,
    form.confirmPassword,
    phoneError,
    emailError,
    passwordHint,
    confirmHint,
    dup.phone,
    dup.email,
    checking.phone,
    checking.email,
    submitting,
  ]);

  // Chuẩn hoá số điện thoại khi nhập
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

  // Debounce check trùng PHONE
  useEffect(() => {
    const val = form.phone.trim();
    if (!val || phoneError) {
      setDup((d) => ({ ...d, phone: false }));
      setDupMsg((m) => ({ ...m, phone: "" }));
      return;
    }
    setChecking((c) => ({ ...c, phone: true }));
    const t = setTimeout(async () => {
      try {
        const raw = sanitizePhone(val);
        // local
        let exists =
          !!StorageManager.getUserByPhone(raw) ||
          StorageManager.getAllUsers().some((u) => {
            const up = (u.phone || "").replace(/\D/g, "");
            const intl = raw.startsWith("0") ? `84${raw.slice(1)}` : raw;
            return up === raw || up === intl;
          });
        // cloud
        try {
          if (!exists) exists = await phoneExists(raw);
        } catch {}
        setDup((d) => ({ ...d, phone: exists }));
        setDupMsg((m) => ({ ...m, phone: exists ? "Số điện thoại đã đăng ký" : "" }));
      } finally {
        setChecking((c) => ({ ...c, phone: false }));
      }
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.phone, phoneError]);

  // Debounce check trùng EMAIL
  useEffect(() => {
    const val = form.email.trim();
    if (!val || emailError) {
      setDup((d) => ({ ...d, email: false }));
      setDupMsg((m) => ({ ...m, email: "" }));
      return;
    }
    setChecking((c) => ({ ...c, email: true }));
    const t = setTimeout(async () => {
      try {
        const emailLower = val.toLowerCase();
        // local
        let exists =
          !!StorageManager.getUserByEmail(val) ||
          StorageManager.getAllUsers().some(
            (u) => (u.email || "").toLowerCase() === emailLower
          );
        // cloud
        try {
          if (!exists) exists = await emailExists(emailLower);
        } catch {}
        setDup((d) => ({ ...d, email: exists }));
        setDupMsg((m) => ({ ...m, email: exists ? "Email đã đăng ký" : "" }));
      } finally {
        setChecking((c) => ({ ...c, email: false }));
      }
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.email, emailError]);

  // Validate cuối trước khi submit
  const validate = () => {
    const e: Record<string, string> = {};

    if (!form.phone) e.phone = "Số điện thoại là bắt buộc";
    else if (!isValidVNPhone(form.phone))
      e.phone = "Số điện thoại Việt Nam 10 số (đầu 03/05/07/08/09)";

    if (!form.email) e.email = "Email là bắt buộc";
    else if (!isValidVNEmail(form.email)) e.email = "Email không hợp lệ";

    if (!form.fullName) e.fullName = "Họ và tên là bắt buộc";

    if (!form.password) e.password = "Mật khẩu là bắt buộc";
    else if (form.password.length < 6) e.password = "Mật khẩu tối thiểu 6 ký tự";

    if (!form.confirmPassword) e.confirmPassword = "Xác nhận mật khẩu là bắt buộc";
    else if (form.password !== form.confirmPassword) e.confirmPassword = "Mật khẩu không khớp";

    if (dup.phone) e.phone = dupMsg.phone || "Số điện thoại đã đăng ký";
    if (dup.email) e.email = dupMsg.email || "Email đã đăng ký";

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
      const phoneKey = sanitizePhone(form.phone);
      const emailNorm = form.email.trim();
      const emailLower = emailNorm.toLowerCase();

      // Double-check trùng
      const dupByPhoneLocal =
        !!StorageManager.getUserByPhone(phoneKey) ||
        StorageManager.getAllUsers().some((u) => {
          const up = (u.phone || "").replace(/\D/g, "");
          const intl = phoneKey.startsWith("0") ? `84${phoneKey.slice(1)}` : phoneKey;
          return up === phoneKey || up === intl;
        });
      const dupByEmailLocal =
        !!StorageManager.getUserByEmail(emailNorm) ||
        StorageManager.getAllUsers().some(
          (u) => (u.email || "").toLowerCase() === emailLower
        );
      const dupByPhoneCloud = await phoneExists(phoneKey);
      const dupByEmailCloud = await emailExists(emailLower);

      if (dupByPhoneLocal || dupByPhoneCloud) {
        setErrors({ general: "Số điện thoại đã được đăng ký" });
        return;
      }
      if (dupByEmailLocal || dupByEmailCloud) {
        setErrors({ general: "Email đã được đăng ký" });
        return;
      }

      // Tạo user mới
      const payload = {
        id: StorageManager.generateId(),
        phone: phoneKey,
        email: emailNorm,
        fullName: form.fullName.trim(),
        password: form.password,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isAdmin: false,
      };
      const newUser = StorageManager.register(payload as any);
      if (!newUser) {
        setErrors({
          general: "Đăng ký thất bại (trùng thông tin hoặc dữ liệu không hợp lệ).",
        });
        return;
      }

      // Ghi nhớ thiết bị + session
      const deviceId = getOrCreateDeviceId();
      StorageManager.markDeviceForUser(phoneKey, deviceId);
      StorageManager.setActiveSession({
        userId: newUser.id,
        phone: newUser.phone,
        deviceId,
        loggedInAt: new Date().toISOString(),
      });

      // Đăng nhập ngay
      const ok = await loginByPhone(phoneKey, form.password);
      if (!ok) {
        setErrors({
          general: "Không thể đăng nhập sau khi đăng ký. Vui lòng thử lại.",
        });
        return;
      }

      // ✅ Điều hướng bắt buộc tới trang Đăng tin miễn phí + cờ welcome
      navigate(`${NEXT_AFTER_REGISTER}?welcome=1`, {
        replace: true,
        state: { welcome: true, fullName: newUser.fullName },
      });
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
          <p className="text-gray-600 mt-2">Tạo tài khoản để đăng tin bất động sản miễn phí</p>
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
                aria-invalid={!!(errors.phone || phoneError || dup.phone)}
                aria-describedby={errors.phone || phoneError || dup.phone ? "phone-error" : undefined}
                maxLength={10}
                className={(errors.phone || phoneError || dup.phone) ? "border-red-500 focus:border-red-500" : ""}
              />
              <p className="text-xs text-gray-500">
                Chấp nhận số Việt Nam 10 số (đầu 03/05/07/08/09).
              </p>
              {(errors.phone || phoneError || dup.phone) && (
                <p id="phone-error" className="text-red-500 text-sm">
                  {errors.phone || phoneError || dupMsg.phone}
                </p>
              )}
              {checking.phone && <p className="text-xs text-gray-500">Đang kiểm tra số điện thoại…</p>}
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
                aria-invalid={!!(errors.email || emailError || dup.email)}
                aria-describedby={errors.email || emailError || dup.email ? "email-error" : undefined}
                className={(errors.email || emailError || dup.email) ? "border-red-500 focus:border-red-500" : ""}
              />
              {(errors.email || emailError || dup.email) && (
                <p id="email-error" className="text-red-500 text-sm">
                  {errors.email || emailError || dupMsg.email}
                </p>
              )}
              {checking.email && <p className="text-xs text-gray-500">Đang kiểm tra email…</p>}
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
                className={errors.fullName ? "border-red-500 focus:border-red-500" : ""}
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
                  aria-invalid={!!(errors.password || passwordHint)}
                  aria-describedby={errors.password || passwordHint ? "password-error" : undefined}
                  className={`pr-10 ${(errors.password || passwordHint) ? "border-red-500 focus:border-red-500" : ""}`}
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
              {(errors.password || passwordHint) && (
                <p id="password-error" className="text-red-500 text-sm">
                  {errors.password || passwordHint}
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
                  aria-invalid={!!(errors.confirmPassword || confirmHint)}
                  aria-describedby={errors.confirmPassword || confirmHint ? "confirmPassword-error" : undefined}
                  className={`pr-10 ${(errors.confirmPassword || confirmHint) ? "border-red-500 focus:border-red-500" : ""}`}
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
              {(errors.confirmPassword || confirmHint) && (
                <p id="confirmPassword-error" className="text-red-500 text-sm">
                  {errors.confirmPassword || confirmHint}
                </p>
              )}
            </div>

            {/* Submit */}
            <div className="md:col-span-2">
              <Button
                type="submit"
                disabled={!canSubmit}
                className="relative group w-full overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to orange-500 text-white font-semibold py-3 transition-transform duration-200 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
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
                  onClick={() => navigate(`/login?next=${encodeURIComponent(NEXT_AFTER_REGISTER)}`)}
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
