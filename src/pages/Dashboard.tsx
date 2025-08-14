// src/pages/Dashboard.tsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import PropertyEditModal from "@/components/PropertyEditModal";
import UserEditModal from "@/components/UserEditModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { User, Home, Edit, Trash2, Eye, Plus, Camera, Mail } from "lucide-react";
import { postDateLabel } from "@utils/date";

import { StorageManager } from "../../utils/storage";
import type { UserAccount, PropertyListing } from "../../utils/storage";

const AVATAR_FALLBACK =
  "https://d64gsuwffb70l.cloudfront.net/6884f3c54508990b982512a3_1754146152775_21c04ef8.png";

/** Nén ảnh về dataURL (JPEG) để lưu bền hơn trong localStorage */
async function resizeToDataURL(file: File, maxSize = 256, quality = 0.85): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });

    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);

    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserAccount | null>(null);
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProperty, setEditingProperty] = useState<PropertyListing | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);

  // input ẩn để up avatar
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user + tin đăng
  useEffect(() => {
    const userData = localStorage.getItem("emyland_user");
    if (!userData) {
      navigate("/login");
      return;
    }
    try {
      const parsedUser = JSON.parse(userData) as UserAccount;
      if (!parsedUser.isLoggedIn) {
        navigate("/login");
        return;
      }
      setUser(parsedUser);

      const identifier = parsedUser.email || parsedUser.phone || "";
      const userProperties = StorageManager.getUserProperties(identifier);
      setProperties(userProperties);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Nghe sự kiện global khi user cập nhật (từ UserEditModal)
  useEffect(() => {
    const onUserUpdated = () => {
      const data = localStorage.getItem("emyland_user");
      if (data) {
        try {
          setUser(JSON.parse(data));
        } catch {}
      }
    };
    window.addEventListener("emyland:userUpdated", onUserUpdated as EventListener);
    return () => window.removeEventListener("emyland:userUpdated", onUserUpdated as EventListener);
  }, []);

  const handleDeleteProperty = (propertyId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tin đăng này?")) {
      StorageManager.deleteProperty(propertyId);
      if (user) {
        const identifier = user.email || user.phone || "";
        const userProperties = StorageManager.getUserProperties(identifier);
        setProperties(userProperties);
      }
    }
  };

  const handleEditProperty = (property: PropertyListing) => {
    setEditingProperty(property);
    setIsEditModalOpen(true);
  };

  const handleSaveProperty = () => {
    if (user) {
      const identifier = user.email || user.phone || "";
      const userProperties = StorageManager.getUserProperties(identifier);
      setProperties(userProperties);
    }
  };

  const handleSaveUser = () => {
    const userData = localStorage.getItem("emyland_user");
    if (userData) setUser(JSON.parse(userData) as UserAccount);
  };

  // ==== Avatar: click ảnh để đổi (bỏ nút riêng) ====
  const onAvatarClick = () => fileInputRef.current?.click();

  const onAvatarSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const dataUrl = await resizeToDataURL(file, 256, 0.85);
      const updated = StorageManager.updateUserAvatar(user.id, dataUrl);
      if (updated) {
        setUser(updated);

        try {
          const logs = JSON.parse(localStorage.getItem("emyland_logs") || "[]");
          logs.unshift({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            type: "login",
            message: "Cập nhật ảnh đại diện",
          });
          localStorage.setItem("emyland_logs", JSON.stringify(logs.slice(0, 100)));
        } catch {}

        localStorage.setItem("emyland_user_updated", String(Date.now()));
        window.dispatchEvent(new Event("emyland:userUpdated")); // 🔔 báo toàn app
        alert("Đã cập nhật ảnh đại diện!");
      }
    } catch (err) {
      console.error(err);
      alert("Không thể cập nhật ảnh. Vui lòng thử lại.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ`;
    if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu`;
    return price.toLocaleString();
  };

  // Dùng nhãn "hôm nay / hôm qua / dd/mm/yyyy"
  const renderPosted = (dateString: string) => {
    const label = postDateLabel(dateString);
    return label ? `Đăng: ${label}` : "";
    // Nếu không có createdAt thì trả rỗng (ẩn phần ngày)
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

  const avatarUrl = (user as any)?.avatarUrl || AVATAR_FALLBACK;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Quản lý tài khoản và tin đăng của bạn</p>
        </div>

        <Tabs defaultValue="properties" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Tin đăng của tôi
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Thông tin cá nhân
            </TabsTrigger>
          </TabsList>

          {/* ====== TAB: PROPERTIES ====== */}
          <TabsContent value="properties" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Tin đăng của tôi ({properties.length})</h2>
              <Button onClick={() => navigate("/post-property")} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Đăng tin mới
              </Button>
            </div>

            {properties.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Home className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có tin đăng nào</h3>
                  <p className="text-gray-600 mb-6">Bắt đầu đăng tin bất động sản đầu tiên của bạn</p>
                  <Button onClick={() => navigate("/post-property")}>Đăng tin ngay</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {properties.map((property) => (
                  <Card key={property.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex gap-6">
                        <div className="w-48 h-32 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                          {property.images && property.images.length > 0 ? (
                            <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Home className="h-8 w-8" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl font-semibold text-gray-900 line-clamp-2">{property.title}</h3>
                            <Badge variant="secondary">{property.propertyType}</Badge>
                          </div>

                          <p className="text-gray-600 mb-2 line-clamp-2">{property.description}</p>

                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                            <span>Diện tích: {property.area}m²</span>
                            <span>•</span>
                            <span>{renderPosted(property.createdAt)}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="text-2xl font-bold text-red-600">{formatPrice(property.price)} VND</div>

                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                Xem
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1"
                                onClick={() => handleEditProperty(property)}
                              >
                                <Edit className="h-4 w-4" />
                                Sửa
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteProperty(property.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Xóa
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ====== TAB: PROFILE ====== */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Thông tin tài khoản</CardTitle>

                  <Button
                    variant="outline"
                    onClick={() => setIsUserEditModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Chỉnh sửa
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  {/* Avatar (click để đổi) */}
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={onAvatarClick}
                      title="Nhấp để đổi ảnh đại diện"
                      className="relative inline-flex rounded-full overflow-hidden ring-2 ring-gray-200 hover:ring-blue-400 focus:outline-none focus:ring-4 transition"
                      aria-label="Đổi ảnh đại diện"
                    >
                      <img src={avatarUrl} alt="Avatar" className="h-16 w-16 object-cover" />
                      <span className="absolute bottom-0 right-0 bg-black/60 text-white rounded-full p-1">
                        <Camera className="h-3.5 w-3.5" />
                      </span>
                    </button>

                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarSelected} />

                    <div className="hidden md:block text-sm text-gray-500">Nhấp vào ảnh để đổi ảnh đại diện</div>
                  </div>

                  {/* Thông tin dạng hàng ngang */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <p className="text-gray-900 break-all">{user?.email}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        * Email dùng để khôi phục tài khoản khi quên mật khẩu.
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Họ tên</label>
                      <p className="text-gray-900">{user?.fullName}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Số điện thoại</label>
                      <p className="text-gray-900">{user?.phone}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <PropertyEditModal
          property={editingProperty}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveProperty}
        />

        {/* ❌ Bỏ allowEmailEdit để không vi phạm type của UserEditModal */}
        <UserEditModal
          user={user}
          isOpen={isUserEditModalOpen}
          onClose={() => setIsUserEditModalOpen(false)}
          onSave={handleSaveUser}
        />
      </div>
    </AppLayout>
  );
};

export default Dashboard;
