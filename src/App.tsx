// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { useAuth, AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";

/* ========== Code-splitting pages ========== */
const Home                 = lazy(() => import("@/pages/Home"));                 // ĐÃ gộp Properties vào Home
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
const NotFound             = lazy(() => import("@/pages/NotFound"));
const SocialHousing        = lazy(() => import("@/pages/SocialHousing"));        // ✅ Trang Nhà ở xã hội

/* ========== Scroll to top on route change ========== */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
}

/* ========== Protected route (giữ nguyên cơ chế cũ) ========== */
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-600">
        Đang kiểm tra phiên đăng nhập…
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
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
