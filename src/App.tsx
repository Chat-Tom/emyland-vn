// src/App.tsx 
import NewsPage from "@/pages/NewsPage";
import NewsDetail from "@/pages/NewsDetail";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect, useState, useCallback } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { useAuth, AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";

/* ========== Code-splitting pages ========== */
const Home                 = lazy(() => import("@/pages/Home"));
const PropertyDetail       = lazy(() => import("@/pages/PropertyDetail"));
const PostProperty         = lazy(() => import("@/pages/PostProperty"));
const Login                = lazy(() => import("@/pages/Login"));
const Register             = lazy(() => import("@/pages/Register"));
const Dashboard            = lazy(() => import("@/pages/Dashboard"));
const SystemDashboard      = lazy(() => import("@/pages/SystemDashboard"));
const PlanningLookup       = lazy(() => import("@/pages/PlanningLookup"));
const ValuationCertificate = lazy(() => import("@/pages/ValuationCertificate"));
const LogsDashboard        = lazy(() => import("@/pages/LogsDashboard"));
const ForgotPassword       = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword        = lazy(() => import("@/pages/reset-password")); // ✅ tên biến hợp lệ
const NotFound             = lazy(() => import("@/pages/NotFound"));
const SocialHousing        = lazy(() => import("@/pages/SocialHousing"));
/* ========= Helpers cho auto-login theo thiết bị (giữ ở đây để không đụng các page) ========= */
// Dùng alias '/utils/*' như trong dự án; nếu khác, đổi path tương ứng.
import { StorageManager } from "@utils/storage";
import { getOrCreateDeviceId } from "@utils/device";

/* ✅ THÊM: Supabase token cho auto-login đa thiết bị */
import { supabase } from "@/lib/supabase";
const ACCESS_TOKEN_KEY = "emy_access_token";

/* ========== Scroll to top on route change ========== */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
}

/* ========== Protected route (nâng cấp: auto-login + redirect với next) ========== */
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // thử auto-login 1 lần nếu chưa đăng nhập nhưng có session + đúng thiết bị
  const [trying, setTrying] = useState(true);

  const attemptFastLogin = useCallback(() => {
    try {
      const s = StorageManager.getActiveSession();
      if (!s) return false;
      const deviceId = getOrCreateDeviceId();
      if (s.deviceId !== deviceId) return false;
      if (!StorageManager.isDeviceRecognized(s.phone, deviceId)) return false;

      const u =
        StorageManager.getUserById(s.userId) ??
        StorageManager.getUserByPhone(s.phone);
      if (!u) return false;

      u.isLoggedIn = true;
      StorageManager.saveUser(u);
      StorageManager.setCurrentUser(u);
      // phát sự kiện để AuthContext/khác (nếu có) sync lại
      window.dispatchEvent(new Event("emyland:userUpdated"));
      return true;
    } catch {
      return false;
    }
  }, []);

  /* ✅ THÊM: Auto-login qua Supabase token (đa thiết bị) */
  const attemptCloudLogin = useCallback(async () => {
    try {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY) || "";
      if (!token) return false;

      const { data, error } = await supabase.rpc("rpc_me", { p_token: token });
      const row = data?.[0];
      if (error || !row?.user_id) return false;

      const u = {
        id: row.user_id as string,
        email: (row.email as string) || "",
        phone: (row.phone as string) || "",
        fullName: (row.full_name as string) || "",
        isLoggedIn: true,
      };
      // Lưu vào storage theo schema cũ để toàn app hiểu
      try {
        StorageManager.saveUser?.(u as any);
        StorageManager.setCurrentUser?.(u as any);
        window.dispatchEvent(new Event("emyland:userUpdated"));
        localStorage.setItem("emyland_user_updated", String(Date.now()));
      } catch {}

      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // chỉ thử khi chưa đăng nhập
      if (!isAuthenticated) {
        const okLocal = attemptFastLogin();
        if (!okLocal) {
          await attemptCloudLogin(); // ✅ thử khôi phục bằng Supabase token
        }
      }
      if (mounted) setTrying(false);
    })();
    return () => { mounted = false; };
  }, [isAuthenticated, attemptFastLogin, attemptCloudLogin]);

  // Loading từ context hoặc đang thử auto-login
  if (isLoading || trying) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-600">
        Đang kiểm tra phiên đăng nhập…
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = location.pathname + (location.search || "");
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return children;
}

function AppInner() {
  return (
    <Router>
      <ScrollToTop />
      <div className="App">
        <Suspense fallback={<div className="p-6 text-gray-600">Đang tải…</div>}>
          <Routes>
            {/* Home */}
            <Route path="/" element={<Home />} />
            {/* Tương thích cũ: /properties -> / */}
            <Route path="/properties" element={<Navigate to="/" replace />} />

            {/* ✅ Nhà ở xã hội (công khai) */}
            <Route path="/social-housing" element={<SocialHousing />} />
            {/* Alias ngắn */}
            <Route path="/noxh" element={<Navigate to="/social-housing" replace />} />

            {/* >>> Tin mới (công khai) */}
            <Route path="/news" element={<NewsPage />} />
            <Route path="/news/:slug" element={<NewsDetail />} />
            {/* Alias tiếng Việt cho dễ nhớ */}
            <Route path="/tin-moi" element={<Navigate to="/news" replace />} />
            <Route path="/tin-tuc" element={<Navigate to="/news" replace />} />

            {/* Chi tiết BĐS */}
            <Route path="/property/:id" element={<PropertyDetail />} />

            {/* Đăng tin (yêu cầu đăng nhập) */}
            <Route
              path="/post-property"
              element={
                <ProtectedRoute>
                  <PostProperty />
                </ProtectedRoute>
              }
            />

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} /> {/* ✅ mới */}

            {/* Dashboard người dùng (yêu cầu đăng nhập) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Quản trị hệ thống (yêu cầu đăng nhập — kiểm tra isAdmin nằm trong SystemDashboard như cũ) */}
            <Route
              path="/system-dashboard"
              element={
                <ProtectedRoute>
                  <SystemDashboard />
                </ProtectedRoute>
              }
            />

            {/* ✅ Alias route cho các nút/đường dẫn cũ: /system, /admin */}
            <Route path="/system" element={<Navigate to="/system-dashboard" replace />} />
            <Route path="/admin" element={<Navigate to="/system-dashboard" replace />} />

            {/* Các trang tiện ích */}
            <Route path="/planning-lookup" element={<PlanningLookup />} />
            <Route path="/valuation-certificate" element={<ValuationCertificate />} />
            <Route path="/logs-dashboard" element={<LogsDashboard />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster />
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="emyland-ui-theme">
      <AuthProvider>
        <AppProvider>
          <AppInner />
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
