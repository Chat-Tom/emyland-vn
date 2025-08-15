// src/components/Header.tsx
import React, { useCallback, useMemo, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { useAuth } from "../contexts/AuthContext";

type LegacyFilter = { label: string; key: string };
type HeaderProps = {
  user?: any;
  onLogout?: () => void;
  // giữ props filters cho tương thích, không hiển thị chip nữa
  filters?: LegacyFilter[] | { selectedChips?: string[] };
  onRemoveFilter?: (key: string) => void;
  className?: string;
};

const DEFAULT_AVATAR =
  "https://d64gsuwffb70l.cloudfront.net/6884f3c54508990b982512a3_1754146152775_21c04ef8.png";

const Header: React.FC<HeaderProps> = ({
  user: propsUser,
  onLogout,
  filters = [],
  onRemoveFilter,
  className = "",
}) => {
  const navigate = useNavigate();
  const { user: hookUser, logout: hookLogout } = useAuth();

  // nguồn user ưu tiên: props -> hook
  const injectedUser = propsUser !== undefined ? propsUser : hookUser;
  const logout = onLogout !== undefined ? onLogout : hookLogout;

  // local state để bắt sự kiện cập nhật từ nơi khác (Dashboard)
  const [currentUser, setCurrentUser] = useState<any>(injectedUser);
  useEffect(() => setCurrentUser(injectedUser), [injectedUser]);

  useEffect(() => {
    const onUpdated = () => {
      try {
        const u = JSON.parse(localStorage.getItem("emyland_user") || "null");
        setCurrentUser(u);
      } catch {
        /* noop */
      }
    };
    window.addEventListener("emyland:userUpdated", onUpdated as any);
    return () => window.removeEventListener("emyland:userUpdated", onUpdated as any);
  }, []);

  const handlePostProperty = useCallback(() => {
    if (currentUser && currentUser.isLoggedIn) navigate("/post-property");
    else navigate("/register");
  }, [navigate, currentUser]);

  const handleLogout = useCallback(() => {
    if (logout) logout();
    navigate("/");
  }, [logout, navigate]);

  const handleBrandClick = useCallback(() => {
    // thông báo cho Home reset bộ lọc + cuộn lên đầu
    window.dispatchEvent(new Event("emyland:resetHome"));
  }, []);

  const menuItems = useMemo(
    () => [
      { label: "Tra cứu quy hoạch", path: "/planning-lookup" },
      { label: "Thẩm định giá - Chứng thư", path: "/valuation-certificate" },
    ],
    []
  );

  const accountDisplay =
    currentUser?.fullName || currentUser?.phone || currentUser?.email || "Tài khoản";
  const avatarSrc = currentUser?.avatarUrl || DEFAULT_AVATAR;

  return (
    <header className={`bg-white shadow-lg sticky top-0 z-50 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2">
          {/* Logo + Đăng tin */}
          <div className="flex items-center gap-4">
            <Link to="/" onClick={handleBrandClick} className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <img
                  src="https://d64gsuwffb70l.cloudfront.net/6884f3c54508990b982512a3_1754128379233_45efa0a3.png"
                  alt="EmyLand Logo"
                  className="h-8 w-8 object-cover rounded-full"
                />
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
                  EmyLand
                </span>
              </div>
              <span className="text-xs text-orange-500 font-semibold -mt-1">
                100% chính chủ - Không trung gian
              </span>
            </Link>

            <Button
              onClick={handlePostProperty}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 animate-bounce flex items-center gap-2"
            >
              <span className="hidden sm:inline">Đăng tin miễn phí</span>
              <span className="sm:hidden">Đăng tin</span>
            </Button>
          </div>

          {/* Menu */}
          <nav className="hidden md:flex items-center space-x-6">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200"
              >
                {item.label}
              </Link>
            ))}

            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 hover:bg-gray-50"
                    aria-label="Mở menu tài khoản"
                  >
                    <img
                      src={avatarSrc}
                      alt="Avatar"
                      className="h-6 w-6 object-cover rounded-full"
                    />
                    <span className="text-sm font-medium">Tài khoản</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => navigate("/dashboard")}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center gap-2 text-gray-600">
                    <User className="h-4 w-4" />
                    <span className="text-sm">{accountDisplay}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2 cursor-pointer text-red-600 hover:text-red-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => navigate("/login")}
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
              >
                Tài khoản
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
