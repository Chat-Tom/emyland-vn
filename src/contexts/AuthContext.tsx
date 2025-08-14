// src/contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { StorageManager } from "@utils/storage";
import type { UserAccount } from "@utils/storage";
import { getDeviceId } from "@utils/device"; // dùng tên chính tắc

/* ===================== Types ===================== */
type AuthContextType = {
  user: UserAccount | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Đăng nhập bằng SĐT (giữ tương thích) */
  loginByPhone: (phone: string, password: string) => Promise<boolean>;
  /** Đăng nhập bằng email HOẶC số điện thoại */
  loginByEmailOrPhone: (identifier: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (user: UserAccount) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

/* ===================== Provider ===================== */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sanitizePhone = (v: string) => String(v ?? "").replace(/\D/g, "");

  /** Hoàn tất flow đăng nhập: ghi nhớ thiết bị, lưu phiên, đồng bộ user */
  const finalizeLogin = useCallback((u: UserAccount): boolean => {
    const deviceId = getDeviceId();

    // Nếu user có phone -> ghi nhớ thiết bị cho phone
    const phoneKey = sanitizePhone(u.phone || "");
    if (phoneKey) {
      StorageManager.markDeviceForUser(phoneKey, deviceId);
    }

    // Lưu phiên để auto-login
    StorageManager.setActiveSession({
      userId: u.id,
      phone: phoneKey,
      deviceId,
      loggedInAt: new Date().toISOString(),
    });

    const merged: UserAccount = {
      ...u,
      isLoggedIn: true,
      lastLoginAt: new Date().toISOString(),
    };

    setUser(merged);
    setIsAuthenticated(true);
    StorageManager.saveUser(merged);
    StorageManager.setCurrentUser(merged);
    return true;
  }, []);

  // ----- Khởi tạo: seed admin + auto-login nếu phiên & thiết bị hợp lệ -----
  useEffect(() => {
    try {
      // Tạo admin mặc định nếu chưa có
      StorageManager.initializeAdmin();

      const deviceId = getDeviceId();
      const session = StorageManager.getActiveSession();

      if (session && session.deviceId === deviceId) {
        const u =
          StorageManager.getUserById(session.userId) ||
          StorageManager.getUserByPhone(session.phone);
        if (u) {
          finalizeLogin(u);
          return;
        }
      }

      // Fallback: nếu currentUser đang loggedIn và thiết bị đã được ghi nhớ
      const current = StorageManager.getCurrentUser();
      if (current?.isLoggedIn) {
        const phoneKey = sanitizePhone(current.phone || "");
        const ok = phoneKey ? StorageManager.isDeviceRecognized(phoneKey, deviceId) : false;
        if (ok) {
          setUser(current);
          setIsAuthenticated(true);
          return;
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [finalizeLogin]);

  // ----- Đăng nhập theo SĐT + mật khẩu (tương thích cũ) -----
  const loginByPhone = useCallback(
    async (phone: string, password: string) => {
      const u = StorageManager.verifyUser(sanitizePhone(phone), password);
      if (!u) return false;
      return finalizeLogin(u);
    },
    [finalizeLogin]
  );

  // ----- Đăng nhập bằng email HOẶC số điện thoại -----
  const loginByEmailOrPhone = useCallback(
    async (identifier: string, password: string) => {
      const id = String(identifier ?? "").trim();

      let u: UserAccount | null = null;
      if (id.includes("@")) {
        // Email
        u = StorageManager.login(id, password);
      } else {
        // Phone
        u = StorageManager.verifyUser(sanitizePhone(id), password);
      }
      if (!u) return false;

      return finalizeLogin(u);
    },
    [finalizeLogin]
  );

  // ----- Đăng xuất (huỷ auto-login hiện tại) -----
  const logout = useCallback(() => {
    StorageManager.logout(); // clear session + currentUser bên trong
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // ----- Cập nhật thông tin user hiện tại -----
  const updateUser = useCallback((u: UserAccount) => {
    setUser(u);
    StorageManager.saveUser(u);
    StorageManager.setCurrentUser(u);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      loginByPhone,
      loginByEmailOrPhone,
      logout,
      updateUser,
    }),
    [user, isAuthenticated, isLoading, loginByPhone, loginByEmailOrPhone, logout, updateUser]
  );

  // Giữ UX cũ: hiển thị spinner trong lúc dò phiên thiết bị
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
