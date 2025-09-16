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

/* ✅ Supabase + token helpers (đa thiết bị) */
import { supabase } from "@/lib/supabase";
const ACCESS_TOKEN_KEY = "emy_access_token";
const saveAccessToken = (t: string) => { try { if (t) localStorage.setItem(ACCESS_TOKEN_KEY, t); } catch {} };
const readAccessToken = () => { try { return localStorage.getItem(ACCESS_TOKEN_KEY) || ""; } catch { return ""; } };

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

/* ✅ Đồng bộ hồ sơ từ Cloud về Local sau khi có token */
async function syncProfileFromCloud() {
  const token = readAccessToken();
  if (!token) return;

  try {
    const { data, error } = await supabase.rpc("rpc_me", { p_access_token: token });
    if (!error && data?.[0]) {
      const me = data[0] as any;
      const mapped = {
        id: me.id || me.user_id || me.uuid || me.phone || me.email,
        fullName: me.full_name || me.name || "",
        email: me.email || null,
        phone: me.phone || null,
        isAdmin: !!me.is_admin,
        avatarUrl: me.avatar_url || me.photo_url || me.avatar || me.photo || me.picture || me.image_url || null,
      };
      try { StorageManager.saveUser(mapped as any); } catch {}
      try { localStorage.setItem("emyland_user_updated", String(Date.now())); } catch {}
      try { window.dispatchEvent(new Event("emyland:userUpdated")); } catch {}
    }
  } catch {}
}

/* ✅ Login Supabase gốc (email + password) để có session thật cho AuthSync */
async function trySupabasePasswordLogin(loginId: string, pwd: string) {
  if (!isEmail(loginId)) return false; // chỉ áp dụng cho email
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginId,
      password: pwd,
    });
    if (error) return false;
    const tok = data?.session?.access_token;
    if (tok) saveAccessToken(tok);
    return true;
  } catch {
    return false;
  }
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

  // ✅ Điều hướng sau đăng nhập
  const DEFAULT_NEXT = "/post-property";
  const nextPath = useMemo(() => {
    const n = sp.get("next");
    return n && n.startsWith("/") ? n : DEFAULT_NEXT;
  }, [sp]);

  // Seed admin (idempotent)
  useEffect(() => {
    StorageManager.initializeAdmin?.();
    const admin = StorageManager.getUserByEmail(ADMIN_EMAIL);
    if (admin && admin.isAdmin && admin.password !== ADMIN_PASSWORD) {
      StorageManager.saveUser({ ...admin, password: ADMIN_PASSWORD, isAdmin: true });
    }
  }, []);

  // Nếu đã đăng nhập thì điều hướng
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

  // ❗ Cảnh báo theo thời gian thực (định dạng)
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

  /* ──────────────────────────────────────────────────────────────
     ✅ THÊM: Kiểm tra “đã đăng ký / trùng” với Cloud (Supabase)
     - Debounce ~450ms mỗi khi người dùng gõ
     - existsCloud: đã đăng ký (hiển thị ✅ info)
     - dupCloudError: trùng nhiều tài khoản → CHẶN SUBMIT
     Không phá logic cũ.
  ────────────────────────────────────────────────────────────── */
  const [existsCloud, setExistsCloud] = useState(false);
  const [dupCloudError, setDupCloudError] = useState("");

  useEffect(() => {
    let alive = true;
    setExistsCloud(false);
    setDupCloudError("");

    const v = identifier.trim();
    if (!v || liveIdentifierError) return;

    const id = isEmail(v) ? v : normalizeVNPhone(v);
    const email = isEmail(id) ? id : null;
    const phone = !email ? sanitizePhone(id) : null;

    const timer = setTimeout(async () => {
      // helper: thử nhiều RPC tên phổ biến; dừng ở cái đầu thành công
      async function tryRpc(name: string, args: Record<string, any>) {
        try {
          const { data, error } = await supabase.rpc(name as any, args as any);
          if (error) return null;
          return data;
        } catch {
          return null;
        }
      }

      let data: any = null;
      // Ưu tiên một RPC tên “chuẩn”; fallback sang tên khác nếu project dùng tên khác
      data = await tryRpc("rpc_check_identifier", { p_email: email, p_phone: phone });
      if (data == null) data = await tryRpc("rpc_exists_identifier", { p_email: email, p_phone: phone });
      if (data == null) data = await tryRpc("rpc_lookup_user", { p_email_or_phone: email ?? phone });

      let exists = false;
      let dup = false;

      // Cố gắng diễn giải kết quả RPC linh hoạt (count/exist/dup/dup_count…)
      if (Array.isArray(data)) {
        const row = data[0] ?? {};
        const cnt =
          row.count ?? row.c ?? row.total ?? row.n ??
          (typeof row === "number" ? row : undefined);
        if (typeof cnt === "number") {
          exists = cnt > 0;
          dup = cnt > 1;
        } else {
          exists = !!(row.exists ?? row.is_exist ?? row.found);
          dup =
            !!(row.duplicated ?? row.dup ?? row.is_dup) ||
            (typeof row.dup_count === "number" && row.dup_count > 1);
        }
      } else if (typeof data === "number") {
        exists = data > 0;
        dup = data > 1;
      }

      // Fallback cuối: nếu có view công khai (users_public) cho phép đếm
      if (data == null) {
        try {
          const col = email ? "email" : "phone";
          const val = email ?? phone!;
          const { count, error } = await supabase
            .from("users_public")
            .select("id", { count: "exact", head: true })
            .eq(col, val);
          if (!error && typeof count === "number") {
            exists = count > 0;
            dup = count > 1;
          }
        } catch {}
      }

      if (!alive) return;
      setExistsCloud(exists);
      setDupCloudError(
        dup ? "Thông tin này đang trùng nhiều tài khoản trên hệ thống. Vui lòng liên hệ hỗ trợ." : ""
      );
    }, 450);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [identifier, liveIdentifierError]);

  const canSubmit = useMemo(() => {
    // Chỉ cho phép submit khi: identifier hợp lệ + có password + không đang loading + KHÔNG bị trùng trên Cloud
    return (
      !liveIdentifierError &&
      !dupCloudError &&
      identifier.trim() !== "" &&
      password.trim() !== "" &&
      !isLoading
    );
  }, [identifier, password, liveIdentifierError, dupCloudError, isLoading]);

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
    if (dupCloudError) e.identifier = dupCloudError; // ✅ chặn ngay khi trùng Cloud
    if (!password) e.password = "Vui lòng nhập mật khẩu";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ✅ Cloud login / migrate user cũ lên Supabase (giữ logic cũ) */
  const tryCloudLoginOrMigrate = async (loginId: string, pwd: string, deviceId: string) => {
    try {
      const { data, error } = await supabase.rpc("rpc_login", {
        p_email_or_phone: loginId,
        p_password: pwd,
        p_device_id: deviceId,
      });
      if (!error && data?.[0]?.access_token) {
        saveAccessToken(data[0].access_token as string);
        return true;
      }

      if (error?.message?.includes("EMAIL_OR_PHONE_NOT_FOUND")) {
        const isMail = isEmail(loginId);
        const localU =
          (isMail && getUserByEmailCI(loginId)) ||
          StorageManager.getUserByPhone(sanitizePhone(loginId)) ||
          null;

        const regParams = {
          p_email: isMail ? loginId : (localU?.email || null),
          p_phone: isMail ? (localU?.phone || null) : sanitizePhone(loginId),
          p_password: pwd,
          p_full_name: localU?.fullName || null,
        };
        const { error: regErr } = await supabase.rpc("rpc_register_user", regParams);
        if (!regErr || /already exists|unique/i.test(regErr.message)) {
          const { data: d2, error: e2 } = await supabase.rpc("rpc_login", {
            p_email_or_phone: loginId,
            p_password: pwd,
            p_device_id: deviceId,
          });
          if (!e2 && d2?.[0]?.access_token) {
            saveAccessToken(d2[0].access_token as string);
            return true;
          }
        }
      }
    } catch {}
    return false;
  };

  /* ✅ Đảm bảo có user Local sau Cloud login */
  const ensureLocalUserAfterCloud = (loginId: string, pwd: string) => {
    const phoneKey = sanitizePhone(loginId);
    const byEmail = isEmail(loginId) ? getUserByEmailCI(loginId) : null;
    const byPhone = StorageManager.getUserByPhone(phoneKey);
    let u: any = byEmail || byPhone || null;

    if (!u) {
      const isMail = isEmail(loginId);
      const email = isMail ? loginId : undefined;
      const phone = isMail ? undefined : phoneKey;
      StorageManager.saveUser({
        id: phone || (email as string),
        fullName: "",
        email,
        phone,
        password: pwd,
        isAdmin: false,
        registeredAt: new Date().toISOString(),
      } as any);
      u = isMail ? getUserByEmailCI(loginId) : StorageManager.getUserByPhone(phoneKey);
    } else if (!u.password) {
      StorageManager.saveUser({ ...u, password: pwd });
    }
    return u;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (isLoading) return;
    setSubmitted(true);

    // Lỗi định dạng hoặc trùng Cloud → chặn ngay
    if (liveIdentifierError || dupCloudError) {
      setErrors((p) => ({ ...p, identifier: liveIdentifierError || dupCloudError }));
      return;
    }
    if (!validate()) return;

    setIsLoading(true);
    setErrors((p) => ({ ...p, general: "" }));

    try {
      const idTrim = identifier.trim();
      const loginId = isEmail(idTrim) ? idTrim : normalizeVNPhone(idTrim);
      const deviceId = getOrCreateDeviceId();

      /* ✅ Ưu tiên Supabase email/password nếu là email; nếu không thì RPC cũ */
      let cloudOK = false;
      if (isEmail(loginId)) {
        cloudOK = await trySupabasePasswordLogin(loginId, password);
      }
      if (!cloudOK) {
        cloudOK = await tryCloudLoginOrMigrate(loginId, password, deviceId);
      }

      if (cloudOK) {
        await syncProfileFromCloud();
        const u = ensureLocalUserAfterCloud(loginId, password);
        if (u) {
          try {
            StorageManager.markDeviceForUser(u.phone || sanitizePhone(loginId), deviceId);
            StorageManager.setActiveSession({
              userId: u.id,
              phone: u.phone || sanitizePhone(loginId),
              deviceId,
              loggedInAt: new Date().toISOString(),
            });
          } catch {}
          try { await loginByEmailOrPhone(loginId, password); } catch {}
        }
        try { localStorage.setItem("emyland_user_updated", String(Date.now())); } catch {}
        return; // effect isAuthenticated sẽ điều hướng
      }

      /* 🧰 Fallback Local (giữ nguyên luồng cũ) */
      const ok = await loginByEmailOrPhone(loginId, password);
      if (!ok) {
        setErrors({ general: "Thông tin đăng nhập không đúng" });
        return;
      }

      let u =
        (isEmail(loginId) && StorageManager.getUserByEmail(loginId)) ||
        StorageManager.getUserByPhone(sanitizePhone(loginId));

      if (!u && isEmail(loginId)) {
        const lower = loginId.toLowerCase();
        u = StorageManager.getAllUsers().find((x) => (x.email || "").toLowerCase() === lower) || null;
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

      try { localStorage.setItem("emyland_user_updated", String(Date.now())); } catch {}
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

    if (isEmail(id)) {
      const u = getUserByEmailCI(id);
      if (!u) {
        setErrors((p) => ({ ...p, identifier: "Email chưa được đăng ký" }));
        return;
      }
      navigate(`/forgot-password?email=${encodeURIComponent(u.email)}`);
      return;
    }

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
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
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
                  if (errors.identifier) setErrors((p) => ({ ...p, identifier: "" }));
                  if (errors.general) setErrors((p) => ({ ...p, general: "" }));
                }}
                placeholder="090xxxxxxx hoặc name@example.com"
                aria-invalid={!!(errors.identifier || liveIdentifierError || dupCloudError)}
                aria-describedby={
                  errors.identifier || liveIdentifierError || dupCloudError ? "identifier-error" : undefined
                }
                className={(errors.identifier || liveIdentifierError || dupCloudError)
                  ? "border-red-500 focus:border-red-500 focus-visible:ring-red-500"
                  : ""}
              />
              {/* Gợi ý/nhắc dưới ô nhập */}
              {mode === "phone" ? (
                <p className="text-xs text-gray-500">Chấp nhận số Việt Nam 10 số (đầu 03/05/07/08/09).</p>
              ) : (
                <p className="text-xs text-gray-500">Ví dụ: {ADMIN_EMAIL}</p>
              )}

              {/* ✅ Đã đăng ký trên Cloud */}
              {!liveIdentifierError && existsCloud && !dupCloudError && (
                <p className="text-xs text-green-600">✅ Thông tin này đã đăng ký trên hệ thống.</p>
              )}

              {/* ❌ Trùng nhiều tài khoản (Cloud) */}
              {(errors.identifier || liveIdentifierError || dupCloudError) && (
                <p id="identifier-error" className="text-red-500 text-sm">
                  {errors.identifier || dupCloudError || liveIdentifierError}
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
                <button type="button" onClick={handleForgotClick} className="text-sm text-blue-600 hover:text-blue-700">
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
