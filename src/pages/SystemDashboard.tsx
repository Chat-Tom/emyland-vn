// src/pages/SystemDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StorageManager, type UserAccount, type PropertyListing } from "@utils/storage";
import {
  Users,
  Home,
  Settings,
  BarChart3,
  Trash2,
  Eye,
  Shield,
  UserX,
  Search,
  Images,
} from "lucide-react";
import LogsContent from "@/components/LogsContent";

/** Lightbox xem ảnh pháp lý/HĐMB */
function Lightbox({
  images,
  onClose,
}: {
  images: string[];
  onClose: () => void;
}) {
  if (!images?.length) return null;
  return (
    <div
      className="fixed inset-0 z-[999] bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-5xl w-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Ảnh pháp lý / HĐMB</div>
          <button className="text-xl leading-none" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[70vh] overflow-auto">
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`legal-${i}`}
              className="w-full h-48 object-cover rounded-lg border"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const SystemDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);

  // Tìm kiếm nhanh
  const [userQuery, setUserQuery] = useState("");
  const [propQuery, setPropQuery] = useState("");

  // Lightbox ảnh pháp lý
  const [legalImages, setLegalImages] = useState<string[] | null>(null);

  useEffect(() => {
    // Kiểm tra quyền admin
    const currentUser = StorageManager.getCurrentUser();
    if (!currentUser || !currentUser.isLoggedIn) {
      navigate("/login", { replace: true });
      return;
    }
    if (!currentUser.isAdmin) {
      navigate("/", { replace: true });
      return;
    }

    // Lấy tất cả dữ liệu hệ thống
    const allUsers = StorageManager.getAllUsers();
    const allProperties = StorageManager.getAllProperties();

    setUsers(allUsers);
    setProperties(allProperties);
    setLoading(false);
  }, [navigate]);

  const refreshUsers = () => setUsers(StorageManager.getAllUsers());
  const refreshProps = () => setProperties(StorageManager.getAllProperties());

  const handleDeleteUser = (email: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa người dùng này?")) {
      StorageManager.deleteUser(email); // giữ tương thích logic cũ
      refreshUsers();
      // StorageManager.deleteUserByEmail cũng đã xoá tin liên quan
      refreshProps();
    }
  };

  const handleDeleteProperty = (propertyId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tin đăng này?")) {
      StorageManager.deleteProperty(propertyId);
      refreshProps();
    }
  };

  const handleToggleAdmin = (u: UserAccount) => {
    const next = !u.isAdmin;
    const msg = next
      ? `Cấp quyền Quản trị cho ${u.fullName || u.email}?`
      : `Gỡ quyền Quản trị của ${u.fullName || u.email}?`;
    if (!window.confirm(msg)) return;

    StorageManager.saveUser({ ...u, isAdmin: next });

    // Nếu gỡ quyền chính mình → đăng xuất
    const cur = StorageManager.getCurrentUser();
    if (cur?.email === u.email && !next) {
      StorageManager.logout();
      alert("Bạn đã gỡ quyền Admin của chính mình. Phiên đăng nhập sẽ kết thúc.");
      navigate("/login", { replace: true });
      return;
    }
    refreshUsers();
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("vi-VN");
    } catch {
      return "";
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ`;
    if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu`;
    return price.toLocaleString();
  };

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return properties.filter((p) => new Date(p.createdAt).toDateString() === today).length;
  }, [properties]);

  const adminsCount = useMemo(() => users.filter((u) => u.isAdmin).length, [users]);
  const onlineCount = useMemo(() => users.filter((u) => u.isLoggedIn).length, [users]);

  const filteredUsers = useMemo(() => {
    if (!userQuery.trim()) return users;
    const q = userQuery.trim().toLowerCase();
    return users.filter(
      (u) =>
        (u.fullName || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q)
    );
  }, [users, userQuery]);

  const filteredProps = useMemo(() => {
    if (!propQuery.trim()) return properties;
    const q = propQuery.trim().toLowerCase();
    return properties.filter(
      (p) =>
        (p.title || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.userEmail || "").toLowerCase().includes(q)
    );
  }, [properties, propQuery]);

  const openLegalImages = (propId: string) => {
    try {
      const key = `emyland_legal_images:${propId}`;
      const raw = localStorage.getItem(key);
      const imgs = raw ? (JSON.parse(raw) as string[]) : [];
      if (!imgs?.length) {
        alert("Tin này chưa có ảnh pháp lý/HĐMB.");
        return;
      }
      setLegalImages(imgs);
    } catch {
      alert("Không đọc được ảnh pháp lý.");
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-lg">Đang tải...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quản lý hệ thống EmyLand</h1>
          <p className="text-gray-600">Quản lý người dùng và tin đăng trong hệ thống</p>
        </div>

        {/* Thống kê tổng quan (giữ logic cũ, bổ sung chỉ số hữu ích) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tổng người dùng</p>
                  <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Home className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tổng tin đăng</p>
                  <p className="text-2xl font-bold text-gray-900">{properties.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tin đăng hôm nay</p>
                  <p className="text-2xl font-bold text-gray-900">{todayCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Hệ thống</p>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <p className="text-xs text-gray-500">Quản trị</p>
                      <p className="text-lg font-bold">{adminsCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Đang online</p>
                      <p className="text-lg font-bold">{onlineCount}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Quản lý người dùng
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Quản lý tin đăng
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard Logs
            </TabsTrigger>
          </TabsList>

          {/* USERS */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-2xl font-semibold">
                Danh sách người dùng ({users.length})
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  className="h-10 pl-9 pr-3 rounded-md border w-72"
                  placeholder="Tìm theo tên, email, SĐT…"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4">
              {filteredUsers.map((user) => (
                <Card key={user.email}>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            {user.fullName || "(Chưa đặt tên)"}
                          </h3>
                          {user.isAdmin && (
                            <Badge className="bg-blue-600 text-white">Admin</Badge>
                          )}
                          <Badge variant={user.isLoggedIn ? "default" : "secondary"}>
                            {user.isLoggedIn ? "Đang online" : "Offline"}
                          </Badge>
                        </div>
                        <p className="text-gray-600">{user.email}</p>
                        {user.phone && <p className="text-gray-600">{user.phone}</p>}
                        <p className="text-sm text-gray-500">
                          Đăng ký: {formatDate(user.registeredAt)}
                        </p>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant={user.isAdmin ? "outline" : "default"}
                          size="sm"
                          className={
                            user.isAdmin ? "text-red-600 hover:text-red-700" : "bg-blue-600"
                          }
                          onClick={() => handleToggleAdmin(user)}
                          title={user.isAdmin ? "Gỡ quyền Admin" : "Cấp quyền Admin"}
                        >
                          {user.isAdmin ? (
                            <>
                              <UserX className="h-4 w-4 mr-1" /> Gỡ Admin
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4 mr-1" /> Cấp Admin
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteUser(user.email)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Xóa
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* PROPERTIES */}
          <TabsContent value="properties" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-2xl font-semibold">
                Danh sách tin đăng ({properties.length})
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  className="h-10 pl-9 pr-3 rounded-md border w-80"
                  placeholder="Tìm theo tiêu đề, mô tả, email chủ tin…"
                  value={propQuery}
                  onChange={(e) => setPropQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4">
              {filteredProps.map((property) => {
                const legalKey = `emyland_legal_images:${property.id}`;
                const legalCount =
                  (() => {
                    try {
                      const raw = localStorage.getItem(legalKey);
                      const arr = raw ? (JSON.parse(raw) as string[]) : [];
                      return arr.length;
                    } catch {
                      return 0;
                    }
                  })() || 0;

                return (
                  <Card key={property.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold line-clamp-1">
                            {property.title}
                          </h3>
                          <p className="text-gray-600 line-clamp-2">
                            {property.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>Giá: {formatPrice(property.price)} VND</span>
                            <span>•</span>
                            <span>Diện tích: {property.area}m²</span>
                            <span>•</span>
                            <span>Đăng: {formatDate(property.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{property.propertyType}</Badge>
                            <span className="text-sm text-gray-500">
                              bởi {property.userEmail}
                            </span>
                            {legalCount > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="ml-2"
                                onClick={() => openLegalImages(property.id)}
                                title="Xem ảnh pháp lý / sổ đỏ / HĐMB"
                              >
                                <Images className="h-4 w-4 mr-1" />
                                Ảnh pháp lý ({legalCount})
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/property/${property.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Xem
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteProperty(property.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Xóa
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* LOGS (giữ như file cũ) */}
          <TabsContent value="logs" className="space-y-6">
            <LogsContent />
          </TabsContent>
        </Tabs>
      </div>

      {Array.isArray(legalImages) && (
        <Lightbox images={legalImages} onClose={() => setLegalImages(null)} />
      )}
    </AppLayout>
  );
};

export default SystemDashboard;
