// src/components/Header.tsx
import React, { useCallback, useMemo, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, LogOut, LayoutDashboard, ChevronDown, Menu } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "./ui/sheet";
import { useAuth } from "../contexts/AuthContext";

// ✅ dùng StorageManager & device để auto-login nếu thiết bị đã nhớ
// (đường dẫn alias '/utils/*' đã dùng xuyên dự án; nếu dự án của Tom khác alias,
// đổi sang '../utils/...' tương ứng)
import { StorageManager } from "/utils/storage";
import { getOrCreateDeviceId } from "/utils/device";

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
    return () =>
      window.removeEventListener("emyland:userUpdated", onUpdated as any);
  }, []);

  /**
   * ✅ Thử auto-login nếu thiết bị đã được nhớ (đúng yêu cầu:
   *  - Lần sau trên cùng thiết bị: tự đăng nhập
   *  - Thiết bị mới: không tự đăng nhập, điều hướng qua đăng ký/đăng nhập)
   */
  const attemptFastLogin = useCallback(() => {
    try {
      const session = StorageManager.getActiveSession();
      if (!session) return false;

      const deviceId = getOrCreateDeviceId();
      if (
        session.deviceId === deviceId &&
        StorageManager.isDeviceRecognized(session.phone, deviceId)
      ) {
        const u =
          StorageManager.getUserById(session.userId) ??
          StorageManager.getUserByPhone(session.phone);
        if (u) {
          u.isLoggedIn = true;
          StorageManager.saveUser(u);
          StorageManager.setCurrentUser(u);
          setCurrentUser(u);
          // phát sự kiện để các nơi khác (nếu có) đồng bộ
          window.dispatchEvent(new Event("emyland:userUpdated"));
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  /**
   * ✅ Nút "Đăng tin miễn phí"
   */
  const POST_PATH = "/post-property";
  const handlePostProperty = useCallback(() => {
    if (currentUser && currentUser.isLoggedIn) {
      navigate(POST_PATH);
      return;
    }
    if (attemptFastLogin()) {
      navigate(POST_PATH);
      return;
    }
    navigate(`/register?next=${encodeURIComponent(POST_PATH)}`);
  }, [navigate, currentUser, attemptFastLogin]);

  /**
   * ✅ Nút "Tin mới" (đăng nhanh – tự xoá sau 30 ngày) — GIỮ LẠI cho tương thích cũ
   *  (không dùng ở UI nữa; để sẵn nếu sau này bật lại chế độ đăng nhanh)
   */
  const DAILY_QS = "?mode=daily&expiresDays=30";
  const handlePostDaily = useCallback(() => {
    const dest = `${POST_PATH}${DAILY_QS}`;
    if (currentUser && currentUser.isLoggedIn) {
      navigate(dest);
      return;
    }
    if (attemptFastLogin()) {
      navigate(dest);
      return;
    }
    navigate(`/register?next=${encodeURIComponent(dest)}`);
  }, [navigate, currentUser, attemptFastLogin]);

  /** >>> Added: "Tin mới" (TIN TỨC) — mở thẳng trang news, không yêu cầu đăng nhập */
  const handleOpenNews = useCallback(() => {
    navigate("/news");
  }, [navigate]);

  const handleLogout = useCallback(() => {
    if (logout) logout();
    navigate("/");
  }, [logout, navigate]);

  const handleBrandClick = useCallback(() => {
    // thông báo cho Home reset bộ lọc + cuộn lên đầu
    window.dispatchEvent(new Event("emyland:resetHome"));
  }, []);

  // dùng chung cho desktop + mobile sheet
  const menuItems = useMemo(
    () => [
      { label: "Tra cứu quy hoạch", path: "/planning-lookup" },
      { label: "Thẩm định giá - Chứng thư", path: "/valuation-certificate" },
    ],
    []
  );

  const accountDisplay =
    currentUser?.fullName ||
    currentUser?.phone ||
    currentUser?.email ||
    "Tài khoản";
  const avatarSrc = currentUser?.avatarUrl || DEFAULT_AVATAR;

  return (
    <header className={`bg-white shadow-lg sticky top-0 z-50 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2">
          {/* Logo + Đăng tin + Menu (mobile) */}
          <div className="flex items-center gap-4">
            <Link
              to="/"
              onClick={handleBrandClick}
              className="flex flex-col items-center"
            >
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

              {/* Tagline: luôn 1 dòng, font-sans đồng nhất */}
              <span
                className="
                  font-sans font-medium tracking-normal leading-none
                  text-[11px] sm:text-xs text-orange-500 -mt-1
                  whitespace-nowrap
                "
              >
                100% chính chủ - không trung gian
              </span>
            </Link>

            {/* Đăng tin miễn phí (DESKTOP) + Tin mới (DESKTOP) */}
            {/* đổi block → flex để đặt thêm nút Tin mới */}
            <div className="hidden md:flex items-center gap-2">
              <Button
                onClick={handlePostProperty}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 animate-bounce"
                title="Đăng tin miễn phí"
              >
                <span>Đăng tin miễn phí</span>
              </Button>

              {/* >>> Tin mới (desktop) — mở trang tin tức */}
              <Button
                onClick={handleOpenNews}
                variant="outline"
                className="border-amber-400 text-amber-700 hover:bg-amber-100 px-3 py-2 rounded-lg"
                title="Tin tức mới"
              >
                Tin mới
              </Button>
            </div>

            {/* Menu + Tin mới (MOBILE) */}
            <Sheet>
              <SheetTrigger asChild>
                <div className="flex items-center gap-2 md:hidden">
                  {/* >>> Tin mới mobile (nhỏ, cạnh Menu) */}
                  <Button
                    onClick={handleOpenNews}
                    variant="outline"
                    className="h-9 px-3 rounded-lg border-amber-400 text-amber-700 hover:bg-amber-100"
                    title="Tin tức mới"
                  >
                    Tin mới
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 md:hidden"
                    aria-label="Mở menu"
                    title="Menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </div>
              </SheetTrigger>

              {/* Nền vàng nhạt + z-index cao để không bị hero đè, có đệm trong để nút không dính mép */}
              <SheetContent
                side="right"
                aria-label="Menu điều hướng"
                aria-describedby="mobile-menu-desc"
                className="w-[320px] sm:w-[360px] bg-amber-50 z-[1000] border-l shadow-2xl px-3 py-3"
                data-logged-in={!!currentUser} // >>> Added: cho phép CSS ẩn/hiện
              >
                <SheetHeader>
                  {/* Ẩn tiêu đề/miêu tả để gọn UI nhưng đáp ứng a11y → xoá cảnh báo Radix */}
                  <SheetTitle className="sr-only">Menu</SheetTitle>
                  <SheetDescription id="mobile-menu-desc" className="sr-only">
                    Menu điều hướng chính trên thiết bị di động
                  </SheetDescription>
                </SheetHeader>

                {/* Thứ tự: Tài khoản → Tra cứu quy hoạch → Thẩm định giá - Chứng thư */}
                <nav className="mt-1 flex flex-col gap-2">
                  {/* Tài khoản (giữ nguyên) */}
                  <Button
                    variant="ghost"
                    aria-label="Đi tới tài khoản"
                    className="btn-account-basic justify-start text-base h-11 px-4 rounded-xl bg-amber-100/90 hover:bg-amber-200 active:bg-amber-300 transition-all duration-150 shadow-sm hover:shadow md:hover:translate-x-0.5"
                    onClick={() =>
                      navigate(
                        currentUser
                          ? "/dashboard"
                          : "/login?next=" + encodeURIComponent("/dashboard")
                      )
                    }
                  >
                    Tài khoản
                  </Button>

                  {/* >>> Khối cá nhân hoá trên MOBILE */}
                  {currentUser ? (
                    <div className="rounded-xl border border-amber-200/70 bg-white/70 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={avatarSrc}
                          alt="Avatar"
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold leading-tight truncate">
                            {accountDisplay}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {currentUser?.phone || currentUser?.email || ""}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          variant="secondary"
                          className="rounded-lg bg-amber-100 hover:bg-amber-200"
                          asChild
                        >
                          <Link to="/dashboard">
                            <LayoutDashboard className="h-4 w-4 mr-1" />
                            Dashboard
                          </Link>
                        </Button>
                        <Button
                          variant="destructive"
                          className="rounded-lg"
                          onClick={handleLogout}
                        >
                          <LogOut className="h-4 w-4 mr-1" />
                          Đăng xuất
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-200/70 bg-white/70 px-4 py-3">
                      <div className="text-sm text-gray-700 mb-2">
                        Chào bạn! Hãy đăng nhập để quản lý tin dễ hơn.
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          asChild
                          className="rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <Link to={`/login?next=${encodeURIComponent("/dashboard")}`}>
                            Đăng nhập
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          asChild
                          className="rounded-lg"
                        >
                          <Link to={`/register?next=${encodeURIComponent("/dashboard")}`}>
                            Đăng ký
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                  {/* <<< End Added */}

                  {/* Tra cứu quy hoạch */}
                  <Button
                    variant="ghost"
                    className="justify-start text-base h-11 px-4 rounded-xl bg-amber-100/90 hover:bg-amber-200 active:bg-amber-300 transition-all duration-150 shadow-sm hover:shadow md:hover:translate-x-0.5"
                    asChild
                  >
                    <Link to="/planning-lookup">Tra cứu quy hoạch</Link>
                  </Button>

                  {/* Thẩm định giá - Chứng thư */}
                  <Button
                    variant="ghost"
                    className="justify-start text-base h-11 px-4 rounded-xl bg-amber-100/90 hover:bg-amber-200 active:bg-amber-300 transition-all duration-150 shadow-sm hover:shadow md:hover:translate-x-0.5"
                    asChild
                  >
                    <Link to="/valuation-certificate">
                      Thẩm định giá - Chứng thư
                    </Link>
                  </Button>
                </nav>

                {/* >>> ẩn nút “Tài khoản” mặc định khi đã đăng nhập (không sửa dòng cũ) */}
                <style>{`
                  [data-logged-in="true"] .btn-account-basic{ display:none; }
                `}</style>
              </SheetContent>
            </Sheet>
          </div>

          {/* >>> Nút Đăng tin miễn phí riêng cho MOBILE (full-width, có nhấp nháy) */}
          <div className="w-full md:hidden">
            <Button
              onClick={handlePostProperty}
              className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all animate-bounce"
              title="Đăng tin miễn phí"
            >
              Đăng tin miễn phí
            </Button>
          </div>
          {/* <<< Added MOBILE button */}

          {/* Menu desktop cũ (giữ nguyên logic) */}
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
                onClick={() =>
                  navigate(
                    "/login?next=" + encodeURIComponent("/dashboard")
                  )
                }
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
              >
                Tài khoản
              </Button>
            )}
          </nav>
        </div>
      </div>

      {/* >>> Ép hàng đầu justify-between & full width ở mobile để nút Menu không bị chèn */}
      <style>{`
        @media (max-width: 767.98px){
          header .container > div > div.flex.items-start { align-items: stretch; }
          header .container > div > div.flex.items-center.gap-4{
            width:100%;
            justify-content:space-between;
          }
        }
      `}</style>
      {/* <<< Added */}
    </header>
  );
};

export default Header;
