// src/pages/Login.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { StorageManager } from "@utils/storage";
import { getOrCreateDeviceId } from "@utils/device";

const ADMIN_EMAIL = "chat301277@gmail.com";
const ADMIN_PASSWORD = "Chat@1221";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function sanitizePhone(v: string) {
  return v.replace(/\D/g, "");
}
function normalizeVNPhone(input: string) {
  const digits = sanitizePhone(input);
  let normalized = digits.startsWith("84") ? "0" + digits.slice(2) : digits;
  if (normalized.length > 0 && normalized[0] !== "0") normalized = "0" + normalized;
  return normalized.slice(0, 10);
}
function isValidVNPhone(v: string) {
  return /^(03|05|07|08|09)\d{8}$/.test(sanitizePhone(v));
}

// Tìm user theo email (không phân biệt hoa/thường)
function getUserByEmailCI(email: string) {
  const direct = StorageManager.getUserByEmail(email);
  if (direct) return direct;
  const low = email.toLowerCase();
  return (
    StorageManager.getAllUsers().find((u) => (u.email || "").toLowerCase() === low) || null
  );
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { loginByEmailOrPhone, isAuthenticated, user } = useAuth();

  const [identifier, setIdentifier] = useState(""); // email hoặc phone
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ✅ Hỗ trợ điều hướng về trang mong muốn sau đăng nhập
  const DEFAULT_NEXT = "/post-property";
  const nextPath = useMemo(() => {
    const n = sp.get("next");
    return n && n.startsWith("/") ? n : DEFAULT_NEXT;
  }, [sp]);

  // Seed admin (idempotent)
  useEffect(() => {
    StorageManager.initializeAdmin?.();
    // Nếu admin đã có nhưng mật khẩu khác, nâng về mật khẩu chuẩn
    const admin = StorageManager.getUserByEmail(ADMIN_EMAIL);
    if (admin && admin.isAdmin && admin.password !== ADMIN_PASSWORD) {
      StorageManager.saveUser({ ...admin, password: ADMIN_PASSWORD, isAdmin: true });
    }
  }, []);

  // Nếu đã đăng nhập, điều hướng: ưu tiên next; nếu không có next thì mặc định theo quyền cũ
  useEffect(() => {
    if (isAuthenticated) {
      if (nextPath) {
        navigate(nextPath, { replace: true });
      } else {
        navigate(user?.isAdmin ? "/system-dashboard" : "/post-property", { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, nextPath]);

  const mode: "email" | "phone" = useMemo(
    () => (isEmail(identifier) ? "email" : "phone"),
    [identifier]
  );

  // ❗ Cảnh báo ngay khi nhập: xác thực theo thời gian thực
  const liveIdentifierError = useMemo(() => {
    const v = identifier.trim();
    if (!v) return "";
    if (mode === "email") {
      return isEmail(v) ? "" : "Email không hợp lệ";
    }
    const normalized = normalizeVNPhone(v);
    return isValidVNPhone(normalized)
      ? ""
      : "Số điện thoại Việt Nam 10 số (đầu 03/05/07/08/09)";
  }, [identifier, mode]);

  const canSubmit = useMemo(() => {
    // Chỉ cho phép submit khi: identifier hợp lệ + có password + không đang loading
    return !liveIdentifierError && identifier.trim() !== "" && password.trim() !== "" && !isLoading;
  }, [identifier, password, liveIdentifierError, isLoading]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!identifier.trim())
      e.identifier = "Vui lòng nhập số điện thoại hoặc email";
    else if (mode === "email") {
      if (!isEmail(identifier)) e.identifier = "Email không hợp lệ";
    } else {
      if (!isValidVNPhone(identifier))
        e.identifier = "Số điện thoại Việt Nam 10 số (đầu 03/05/07/08/09)";
    }
    if (!password) e.password = "Vui lòng nhập mật khẩu";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (isLoading) return;
    setSubmitted(true);

    // Chặn đăng nhập nếu đang có lỗi định dạng khi nhập
    if (liveIdentifierError) {
      setErrors((p) => ({ ...p, identifier: liveIdentifierError }));
      return;
    }
    if (!validate()) return;

    setIsLoading(true);
    setErrors((p) => ({ ...p, general: "" }));

    try {
      // Chuẩn hoá identifier để đăng nhập chuẩn xác
      const idTrim = identifier.trim();
      const loginId = isEmail(idTrim) ? idTrim : normalizeVNPhone(idTrim);

      const ok = await loginByEmailOrPhone(loginId, password);
      if (!ok) {
        setErrors({ general: "Thông tin đăng nhập không đúng" });
        return;
      }

      // ✅ Nhớ thiết bị + tạo ActiveSession cho auto-login lần sau
      const deviceId = getOrCreateDeviceId();

      // Tìm user để lưu phone chính xác (kể cả đăng nhập bằng email)
      let u =
        (isEmail(loginId) && StorageManager.getUserByEmail(loginId)) ||
        StorageManager.getUserByPhone(sanitizePhone(loginId));

      // Fallback tìm email không phân biệt hoa/thường
      if (!u && isEmail(loginId)) {
        const lower = loginId.toLowerCase();
        u =
          StorageManager.getAllUsers().find(
            (x) => (x.email || "").toLowerCase() === lower
          ) || null;
      }

      if (u) {
        StorageManager.markDeviceForUser(u.phone, deviceId);
        StorageManager.setActiveSession({
          userId: u.id,
          phone: u.phone,
          deviceId,
          loggedInAt: new Date().toISOString(),
        });
      }

      // Phát tín hiệu để chỗ khác sync UI (nếu có lắng nghe)
      try {
        localStorage.setItem("emyland_user_updated", String(Date.now()));
      } catch {
        /* no-op */
      }

      // Không điều hướng ngay tại đây — effect dựa trên isAuthenticated sẽ xử lý để tránh race-condition
    } catch {
      setErrors({ general: "Có lỗi xảy ra. Vui lòng thử lại." });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Quên mật khẩu: chỉ cho đi nếu ĐÚNG & ĐÃ ĐĂNG KÝ
  const handleForgotClick = () => {
    const id = identifier.trim();

    if (!id) {
      setErrors((p) => ({
        ...p,
        identifier: "Vui lòng nhập số điện thoại hoặc email trước khi khôi phục mật khẩu",
      }));
      return;
    }

    // Email
    if (isEmail(id)) {
      const u = getUserByEmailCI(id);
      if (!u) {
        setErrors((p) => ({ ...p, identifier: "Email chưa được đăng ký" }));
        return;
      }
      navigate(`/forgot-password?email=${encodeURIComponent(u.email)}`);
      return;
    }

    // Số điện thoại
    if (!isValidVNPhone(id)) {
      setErrors((p) => ({ ...p, identifier: "Số điện thoại Việt Nam 10 số (đầu 03/05/07/08/09)" }));
      return;
    }
    const phoneKey = sanitizePhone(id);
    const u = StorageManager.getUserByPhone(phoneKey);
    if (!u) {
      setErrors((p) => ({ ...p, identifier: "Số điện thoại chưa được đăng ký" }));
      return;
    }
    if (!u.email) {
      setErrors((p) => ({
        ...p,
        identifier: "Tài khoản này chưa có email khôi phục. Vui lòng liên hệ hỗ trợ.",
      }));
      return;
    }
    navigate(`/forgot-password?email=${encodeURIComponent(u.email)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-8 w-8 text-blue-600" aria-hidden />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
              EmyLand
            </span>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">Đăng nhập</CardTitle>
          <p className="text-gray-600 mt-2">
            Sử dụng số điện thoại <b>hoặc email</b> để đăng nhập
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {errors.general && (
              <div
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
                role="alert"
              >
                {errors.general}
              </div>
            )}

            {/* Identifier */}
            <div className="space-y-2">
              <label htmlFor="identifier" className="text-sm font-medium text-gray-700">
                Số điện thoại hoặc email *
              </label>
              <Input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  // xoá lỗi cũ khi người dùng tiếp tục nhập
                  if (errors.identifier) setErrors((p) => ({ ...p, identifier: "" }));
                  if (errors.general) setErrors((p) => ({ ...p, general: "" }));
                }}
                placeholder="090xxxxxxx hoặc name@example.com"
                aria-invalid={!!(errors.identifier || liveIdentifierError)}
                aria-describedby={
                  errors.identifier || liveIdentifierError ? "identifier-error" : undefined
                }
                className={(errors.identifier || liveIdentifierError)
                  ? "border-red-500 focus:border-red-500 focus-visible:ring-red-500"
                  : ""}
              />
              {mode === "phone" ? (
                <p className="text-xs text-gray-500">
                  Chấp nhận số Việt Nam 10 số (đầu 03/05/07/08/09).
                </p>
              ) : (
                <p className="text-xs text-gray-500">Ví dụ: {ADMIN_EMAIL}</p>
              )}
              {(errors.identifier || liveIdentifierError) && (
                <p id="identifier-error" className="text-red-500 text-sm">
                  {errors.identifier || liveIdentifierError}
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
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((p) => ({ ...p, password: "" }));
                    if (errors.general) setErrors((p) => ({ ...p, general: "" }));
                  }}
                  placeholder="Nhập mật khẩu"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className={`pr-10 ${errors.password ? "border-red-500 focus:border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {submitted && !password && (
                <p id="password-error" className="text-red-500 text-sm">
                  {errors.password || "Vui lòng nhập mật khẩu"}
                </p>
              )}

              {/* ✅ Quên mật khẩu: CHỈ cho đi nếu tài khoản tồn tại */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotClick}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Quên mật khẩu?
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={!canSubmit}
              className="relative group w-full overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-orange-500 text-white font-semibold py-3 transition-transform duration-200 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 blur-sm"
              />
              <span className="relative">{isLoading ? "Đang đăng nhập..." : "Đăng nhập"}</span>
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Chưa có tài khoản?{" "}
              <button
                type="button"
                onClick={() => navigate(`/register?next=${encodeURIComponent(nextPath)}`)}
                className="relative group inline-flex items-center px-2 py-1 rounded-md font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-md bg-blue-100 opacity-0 group-hover:opacity-100 transition-opacity"
                />
                <span className="relative">Đăng ký mới</span>
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
