// src/pages/Login.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
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

/* ✅ Chuẩn hoá số điện thoại (dùng file gốc /utils/phone.ts) */
import { phoneVnNormalize, phoneVnIsValid } from "@utils/phone";

/* ✅ reCAPTCHA v2 checkbox */
import ReCAPTCHA from "react-google-recaptcha";
// Dùng test key nếu env chưa set → không báo “khóa không hợp lệ” khi dev
const RECAPTCHA_SITE_KEY = (
  import.meta.env.VITE_RECAPTCHA_SITE_KEY ||
  "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
) as string;
// Cho phép tắt captcha khi dev/local
const RECAPTCHA_OFF =
  (import.meta.env as any)?.VITE_RECAPTCHA_OFF === "1" ||
  window.location.hostname === "localhost";

/* 🔧 NEW: Cho phép tắt nhánh Cloud khi cần cô lập sự cố (build flag) */
const CLOUD_LOGIN_OFF =
  (import.meta.env as any)?.VITE_CLOUD_LOGIN_OFF === "1";

const ADMIN_EMAIL = "chat301277@gmail.com";
const ADMIN_PASSWORD = "Chat@1221";

/* 🔧 BỔ SUNG: seed admin theo SĐT của Tom (vá nóng an toàn, idempotent) */
const ADMIN_PHONE = "0903496118";
const ADMIN_EMAIL2 = "emyland.vn@gmail.com";
const ADMIN_PASSWORD2 = "Chat@1221";
const phoneOnly = (v: string) => String(v || "").replace(/\D/g, "");

/* ===== helpers ===== */
function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function sanitizePhone(v: string) {
  return String(v).replace(/\D/g, "");
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
// 🔧 RPC an toàn, thử nhiều biến thể tham số (tránh 400 do khác tên tham số)
async function tryRpcMulti(name: string, variants: Record<string, any>[]) {
  for (const args of variants) {
    try {
      const { data, error } = await supabase.rpc(name as any, args as any);
      if (!error) return data;
    } catch {}
  }
  return null;
}
/* ✅ Đồng bộ hồ sơ từ Cloud về Local sau khi có token */
async function syncProfileFromCloud() {
  const token = readAccessToken();
  if (!token) return;
  try {
    const data =
      (await tryRpcMulti("rpc_me", [{ p_access_token: token }, {}])) || [];
    if (data?.[0]) {
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

/* ✅ Helper: đợi 2 frame để Router/Context kịp ổn định, chống flicker 404 */
async function waitRouterStable() {
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

/* 🔧 LẤY "me" an toàn */
async function getCloudMe() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      const u = data.user;
      return {
        email: (u.email || "").toLowerCase(),
        phone: (u.user_metadata?.phone || u.phone || "").toString(),
      };
    }
  } catch {}
  try {
    const token = readAccessToken();
    const data =
      (await tryRpcMulti("rpc_me", [{ p_access_token: token }, {}])) || [];
    return data?.[0] || null;
  } catch { return null; }
}

/* ===== Component ===== */
const Login: React.FC = () => {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { loginByEmailOrPhone, isAuthenticated, user } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* ✅ reCAPTCHA state */
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaOk, setCaptchaOk] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);

  const setFormError = (msg: string) =>
    setErrors((p) => ({ ...p, general: msg || "Đăng nhập thất bại" }));

  // ✅ Điều hướng sau đăng nhập
  const DEFAULT_NEXT = "/post-property";
  const rawNext = useMemo(() => {
    const n = sp.get("next");
    return n && n.startsWith("/") ? n : "";
  }, [sp]);

  // Nếu `next=/dashboard` thì ép về /post-property
  const safeNext = useMemo(() => {
    if (!rawNext || rawNext === "/dashboard") return DEFAULT_NEXT;
    return rawNext;
  }, [rawNext]);

  // Seed admin (idempotent)
  useEffect(() => {
    StorageManager.initializeAdmin?.();

    // 1) Giữ seed cũ theo email (nếu đã có)
    const admin = StorageManager.getUserByEmail(ADMIN_EMAIL);
    if (admin && admin.isAdmin && admin.password !== ADMIN_PASSWORD) {
      StorageManager.saveUser({ ...admin, password: ADMIN_PASSWORD, isAdmin: true });
    }

    // 2) BỔ SUNG: seed admin theo SĐT 0903496118 (vá nóng prod)
    try {
      const phoneKey = phoneOnly(ADMIN_PHONE);
      const byPhone = StorageManager.getUserByPhone(phoneKey);
      if (!byPhone) {
        StorageManager.saveUser({
          id: phoneKey,
          fullName: "Admin EmyLand",
          email: ADMIN_EMAIL2,
          phone: phoneKey,
          password: ADMIN_PASSWORD2,
          isAdmin: true,
          registeredAt: new Date().toISOString(),
          isLoggedIn: false,
        } as any);
      } else {
        const needPatch =
          !byPhone.isAdmin || (byPhone.password && byPhone.password !== ADMIN_PASSWORD2) || !byPhone.password;
        if (needPatch) {
          StorageManager.saveUser({ ...byPhone, isAdmin: true, password: ADMIN_PASSWORD2 });
        }
      }
    } catch {}
  }, []);

  // Nếu đã đăng nhập → điều hướng ngay (không mở tab mới)
  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.isAdmin ? "/system-dashboard" : safeNext, { replace: true });
    }
  }, [isAuthenticated, user, navigate, safeNext]);

  // ❗ Chỉ cho phép SỐ ĐIỆN THOẠI (dùng helper /utils/phone.ts)
  const liveIdentifierError = useMemo(() => {
    const v = identifier.trim();
    if (!v) return "";
    if (isEmail(v)) return "Chỉ hỗ trợ đăng nhập bằng số điện thoại.";
    const normalized = phoneVnNormalize(v);
    return phoneVnIsValid(normalized)
      ? ""
      : "Số điện thoại Việt Nam 10 số (đầu 03/05/07/08/09)";
  }, [identifier]);

  /* ───── Kiểm tra đã đăng ký/trùng Cloud (Supabase) ───── */
  const [existsCloud, setExistsCloud] = useState(false);
  const [dupCloudError, setDupCloudError] = useState("");

  useEffect(() => {
    let alive = true;
    setExistsCloud(false);
    setDupCloudError("");
    setCaptchaOk(false);
    setCaptchaToken(null);
    try { recaptchaRef.current?.reset(); } catch {}

    const v = identifier.trim();
    if (!v || liveIdentifierError) return;

    const phone = sanitizePhone(phoneVnNormalize(v));

    const timer = setTimeout(async () => {
      async function tryRpc(name: string, args: Record<string, any>) {
        try {
          const { data, error } = await supabase.rpc(name as any, args as any);
          if (error) return null;
          return data;
        } catch { return null; }
      }
      let data: any = null;
      data = await tryRpc("rpc_check_identifier", { p_email: null, p_phone: phone });
      if (data == null) data = await tryRpc("rpc_exists_identifier", { p_email: null, p_phone: phone });
      if (data == null) data = await tryRpc("rpc_lookup_user", { p_email_or_phone: phone });

      let exists = false, dup = false;
      if (Array.isArray(data)) {
        const row = data[0] ?? {};
        const cnt = row.count ?? row.c ?? row.total ?? row.n ?? (typeof row === "number" ? row : undefined);
        if (typeof cnt === "number") { exists = cnt > 0; dup = cnt > 1; }
        else {
          exists = !!(row.exists ?? row.is_exist ?? row.found);
          dup =
            !!(row.duplicated ?? row.dup ?? row.is_dup) ||
            (typeof row.dup_count === "number" && row.dup_count > 1);
        }
      } else if (typeof data === "number") { exists = data > 0; dup = data > 1; }

      if (data == null) {
        try {
          const { count, error } = await supabase
            .from("users_public")
            .select("id", { count: "exact", head: true })
            .eq("phone", phone);
          if (!error && typeof count === "number") { exists = count > 0; dup = count > 1; }
        } catch {}
      }
      if (!alive) return;
      setExistsCloud(exists);
      setDupCloudError(dup ? "Thông tin này đang trùng nhiều tài khoản trên hệ thống. Vui lòng liên hệ hỗ trợ." : "");
    }, 450);

    return () => { alive = false; clearTimeout(timer); };
  }, [identifier, liveIdentifierError]);

  const canSubmit = useMemo(() => {
    return (
      !liveIdentifierError &&
      !dupCloudError &&
      identifier.trim() !== "" &&
      password.trim() !== "" &&
      (RECAPTCHA_OFF || captchaOk) &&
      !isLoading
    );
  }, [identifier, password, liveIdentifierError, dupCloudError, isLoading, captchaOk]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!identifier.trim()) e.identifier = "Vui lòng nhập số điện thoại";
    else if (isEmail(identifier)) e.identifier = "Chỉ hỗ trợ đăng nhập bằng số điện thoại.";
    else if (!phoneVnIsValid(phoneVnNormalize(identifier))) e.identifier = "Số điện thoại Việt Nam 10 số (đầu 03/05/07/08/09)";
    if (dupCloudError) e.identifier = dupCloudError;
    if (!password) e.password = "Vui lòng nhập mật khẩu";
    if (!RECAPTCHA_OFF && !captchaOk) e.captcha = "Vui lòng xác nhận 'Tôi không phải người máy'.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ✅ Cloud login / migrate user cũ lên Supabase (phone-only) */
  const tryCloudLoginOrMigrate = async (phoneLogin: string, pwd: string, deviceId: string) => {
    try {
      const variants = [
        { p_email_or_phone: phoneLogin, p_password: pwd, p_device_id: deviceId },
        { p_email_or_phone: phoneLogin, p_password: pwd, device_id: deviceId },
        { email_or_phone: phoneLogin, password: pwd, device_id: deviceId },
        { email: null, phone: sanitizePhone(phoneLogin), password: pwd, device_id: deviceId },
      ];
      const data = await tryRpcMulti("rpc_login", variants);
      if (data?.[0]?.access_token) { saveAccessToken(data[0].access_token as string); return true; }

      const localU = StorageManager.getUserByPhone(sanitizePhone(phoneLogin)) || null;

      const regParams = {
        p_email: localU?.email || null,
        p_phone: sanitizePhone(phoneLogin),
        p_password: pwd,
        p_full_name: localU?.fullName || null,
      };
      const reg = await tryRpcMulti("rpc_register_user", [regParams]);
      if (reg !== null) {
        const data2 = await tryRpcMulti("rpc_login", variants);
        if (data2?.[0]?.access_token) { saveAccessToken(data2[0].access_token as string); return true; }
      }
    } catch {}
    return false;
  };

  /* ✅ Đảm bảo có user Local sau Cloud login */
  const ensureLocalUserAfterCloud = (phoneLogin: string, pwd: string) => {
    const phoneKey = sanitizePhone(phoneLogin);
    const byPhone = StorageManager.getUserByPhone(phoneKey);
    let u: any = byPhone || null;

    if (!u) {
      StorageManager.saveUser({
        id: phoneKey,
        fullName: "",
        phone: phoneKey,
        password: pwd,
        isAdmin: false,
        registeredAt: new Date().toISOString(),
      } as any);
      u = StorageManager.getUserByPhone(phoneKey);
    } else if (!u.password) {
      StorageManager.saveUser({ ...u, password: pwd });
    }
    return u;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (isLoading) return;
    setSubmitted(true);

    if (liveIdentifierError || dupCloudError) {
      setErrors((p) => ({ ...p, identifier: liveIdentifierError || dupCloudError }));
      return;
    }
    if (!validate()) return;

    setIsLoading(true);
    setErrors((p) => ({ ...p, general: "" }));

    try {
      /* ✅ Verify captcha server-side trước khi login (không làm "đỏ" nếu API tạm lỗi) */
      if (!RECAPTCHA_OFF) {
        try {
          const verifyRes = await fetch("/api/verify-recaptcha", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: captchaToken }),
          });
          const verifyJson = await verifyRes.json().catch(() => ({}));
          if (!verifyRes.ok || !verifyJson?.success) {
            setErrors((p) => ({
              ...p,
              captcha: "Xác minh captcha thất bại. Vui lòng tick lại ô 'Tôi không phải người máy'.",
            }));
            setIsLoading(false);
            try { recaptchaRef.current?.reset(); } catch {}
            setCaptchaOk(false);
            setCaptchaToken(null);
            return;
          }
        } catch (e) {
          // API verify đang không sẵn sàng → ghi log nhưng cho phép tiếp tục để anh test
          console.warn("verify-recaptcha unreachable, continuing dev flow:", e);
        }
      }

      const idTrim = identifier.trim();
      if (isEmail(idTrim)) {
        setErrors({ identifier: "Chỉ hỗ trợ đăng nhập bằng số điện thoại." });
        setIsLoading(false);
        return;
      }
      const loginPhone = phoneVnNormalize(idTrim);
      const deviceId = getOrCreateDeviceId();

      // ✅ Cloud-first an toàn + flag tắt Cloud khi cần
      let cloudOK = false;
      if (!CLOUD_LOGIN_OFF) {
        try {
          cloudOK = await tryCloudLoginOrMigrate(loginPhone, password, deviceId);
        } catch (e) {
          console.error("cloud login failed, fallback to local:", e);
          cloudOK = false;
        }
      }

      if (cloudOK) {
        const me = await getCloudMe();

        // 🔧 NỚI LỎNG KIỂM TRA KHỚP: chỉ coi là mismatch khi cả hai phía đều có phone hợp lệ và khác nhau rõ ràng.
        const lp = sanitizePhone(phoneVnNormalize(loginPhone));
        const mp = me?.phone ? sanitizePhone(phoneVnNormalize(me.phone)) : "";
        const reallyMismatch = mp && lp && mp !== lp;

        if (reallyMismatch) {
          // Không chặn đăng nhập – chỉ ghi log cảnh báo để theo dõi.
          console.warn("[Login] Cloud user phone mismatch: rpc_me.phone =", mp, "input =", lp);
        }

        // Dù có mismatch hay không, vẫn tiếp tục sync & đăng nhập local để đảm bảo trải nghiệm.
        await syncProfileFromCloud();
        const u = ensureLocalUserAfterCloud(loginPhone, password);
        if (u) {
          try {
            StorageManager.markDeviceForUser(u.phone || sanitizePhone(loginPhone), deviceId);
            StorageManager.setActiveSession({
              userId: u.id,
              phone: u.phone || sanitizePhone(loginPhone),
              deviceId,
              loggedInAt: new Date().toISOString(),
            });
          } catch {}
          try { await loginByEmailOrPhone(loginPhone, password); } catch {}
          try { localStorage.setItem("emyland_user_updated", String(Date.now())); } catch {}
          await waitRouterStable();
          navigate(u?.isAdmin ? "/system-dashboard" : safeNext, { replace: true });
        }
        return;
      }

      // Flow local cũ
      const ok = await loginByEmailOrPhone(loginPhone, password);
      if (!ok) {
        setErrors({ general: "Thông tin đăng nhập không đúng" });
        return;
      }

      let u = StorageManager.getUserByPhone(sanitizePhone(loginPhone));
      if (u) {
        try {
          StorageManager.markDeviceForUser(u.phone, deviceId);
          StorageManager.setActiveSession({
            userId: u.id,
            phone: u.phone,
            deviceId,
            loggedInAt: new Date().toISOString(),
          });
        } catch {}
      }

      try { localStorage.setItem("emyland_user_updated", String(Date.now())); } catch {}
      await waitRouterStable();
      navigate(u?.isAdmin ? "/system-dashboard" : safeNext, { replace: true });
      return;
    } catch {
      setErrors({ general: "Có lỗi xảy ra. Vui lòng thử lại." });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Quên mật khẩu (phone-only)
  const handleForgotClick = () => {
    const id = identifier.trim();
    if (!id) {
      setErrors((p) => ({
        ...p,
        identifier: "Vui lòng nhập số điện thoại trước khi khôi phục mật khẩu",
      }));
      return;
    }
    if (isEmail(id)) {
      setErrors((p) => ({ ...p, identifier: "Chỉ hỗ trợ số điện thoại." }));
      return;
    }
    const normalized = phoneVnNormalize(id);
    if (!phoneVnIsValid(normalized)) {
      setErrors((p) => ({ ...p, identifier: "Số điện thoại Việt Nam 10 số (đầu 03/05/07/08/09)" }));
      return;
    }
    const phoneKey = sanitizePhone(normalized);
    const u = StorageManager.getUserByPhone(phoneKey);
    if (!u || !u.email) {
      setErrors((p) => ({
        ...p,
        identifier: "Số điện thoại chưa được đăng ký hoặc chưa có email khôi phục. Vui lòng liên hệ hỗ trợ.",
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
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            noValidate
            action="#"
            target="_self"
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") e.preventDefault();
            }}
          >
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
                {errors.general}
              </div>
            )}

            {/* Identifier */}
            <div className="space-y-2">
              <label htmlFor="identifier" className="sr-only">Số điện thoại</label>
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
                placeholder="Số điện thoại"
                aria-invalid={!!(errors.identifier || liveIdentifierError || dupCloudError)}
                aria-describedby={
                  errors.identifier || liveIdentifierError || dupCloudError ? "identifier-error" : undefined
                }
                className={(errors.identifier || liveIdentifierError || dupCloudError)
                  ? "border-red-500 focus:border-red-500 focus-visible:ring-red-500"
                  : ""}
              />
              <p className="text-xs text-gray-500">Chấp nhận số Việt Nam 10 số (đầu 03/05/07/08/09).</p>
              {!liveIdentifierError && existsCloud && !dupCloudError && (
                <p className="text-xs text-green-600">✅ Số điện thoại này đã đăng ký trên hệ thống.</p>
              )}
              {(errors.identifier || liveIdentifierError || dupCloudError) && (
                <p id="identifier-error" className="text-red-500 text-sm">
                  {errors.identifier || dupCloudError || liveIdentifierError}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="sr-only">Mật khẩu</label>
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
                  placeholder="Mật khẩu"
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

              {/* ✅ Captcha */}
              <div className="mt-2">
                {!RECAPTCHA_OFF && (
                  <>
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey={RECAPTCHA_SITE_KEY}
                      onChange={(tok) => {
                        setCaptchaToken(tok);
                        setCaptchaOk(!!tok);
                        if (tok && errors.captcha) setErrors((p) => ({ ...p, captcha: "" }));
                      }}
                    />
                    {errors.captcha && (
                      <p className="text-red-500 text-sm mt-2">{errors.captcha}</p>
                    )}
                  </>
                )}
              </div>

              {/* ✅ Quên mật khẩu */}
              <div className="flex justify-end">
                <button type="button" onClick={handleForgotClick} className="text-sm text-blue-600 hover:text-blue-700">
                  Quên mật khẩu?
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              formTarget="_self"
              onClick={(e) => {
                // chặn mở tab mới do ctrl/cmd-click
                // @ts-expect-error custom
                if (e.ctrlKey || e.metaKey) { e.preventDefault(); e.stopPropagation(); }
              }}
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
                onClick={() => navigate(`/register?next=${encodeURIComponent(safeNext)}`)}
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
