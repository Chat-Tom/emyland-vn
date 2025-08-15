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
  Pencil,
} from "lucide-react";
import LogsContent from "@/components/LogsContent";
import { PROPERTY_TYPES } from "@/data/property-types";
import { provinces, wardsByProvince } from "@/data/vietnam-locations";

type ListingType = "sell" | "rent";

/* ======================= Lightbox ảnh pháp lý ======================= */
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

/* ======================= Helpers / dữ liệu chọn ======================= */
const BIG6 = [
  "Thành phố Hồ Chí Minh",
  "Thành phố Hà Nội",
  "Thành phố Đà Nẵng",
  "Thành phố Hải Phòng",
  "Thành phố Cần Thơ",
  "Thành phố Huế",
];
const viSort = (a: string, b: string) => a.localeCompare(b, "vi");
const wardWeight = (name: string) => (name.startsWith("Phường") ? 0 : name.startsWith("Xã") ? 1 : 2);

/* ======================= Modal SỬA TIN (đầy đủ) ======================= */
function EditPropertyModal({
  property,
  onClose,
  onSaved,
}: {
  property: any; // dữ liệu local linh hoạt
  onClose: () => void;
  onSaved: () => void;
}) {
  const ltInit: ListingType =
    (property?.listingType as ListingType) ??
    (typeof property?.rent_per_month === "number" ? "rent" : "sell");

  // ---- Location mapping ----
  const findProvinceIdByName = (name?: string): string => {
    if (!name) return "";
    const p = provinces.find((x) => x.provinceName.trim() === String(name).trim());
    return p?.provinceId ?? "";
  };
  const sortedProvinces = useMemo(() => {
    const list = provinces
      .filter((p) => !/Tỉnh\s*\/\s*Thành\s*Phố/i.test(p.provinceName) && p.provinceName.trim() !== "")
      .slice()
      .sort((a, b) => {
        const ia = BIG6.indexOf(a.provinceName);
        const ib = BIG6.indexOf(b.provinceName);
        if (ia !== -1 || ib !== -1) {
          if (ia !== -1 && ib === -1) return -1;
          if (ia === -1 && ib !== -1) return 1;
          return ia - ib;
        }
        return a.provinceName.localeCompare(b.provinceName, "vi");
      });
    return list;
  }, []);
  const [provinceId, setProvinceId] = useState<string>(findProvinceIdByName(property?.location?.province));
  const wardOptions = useMemo(() => {
    if (!provinceId) return [];
    const arr = wardsByProvince[provinceId] || [];
    return arr.slice().sort((a, b) => {
      const wa = wardWeight(a);
      const wb = wardWeight(b);
      if (wa !== wb) return wa - wb;
      return a.localeCompare(b, "vi");
    });
  }, [provinceId]);

  // ---- Main state ----
  const [listingType, setListingType] = useState<ListingType>(ltInit);
  const [title, setTitle] = useState<string>(property?.title ?? "");
  const [description, setDescription] = useState<string>(property?.description ?? "");
  const [propertyType, setPropertyType] = useState<string>(property?.propertyType ?? "");
  const [area, setArea] = useState<string>(String(property?.area ?? ""));
  const [priceTy, setPriceTy] = useState<string>(
    listingType === "sell" && property?.price
      ? String((Number(property.price) / 1_000_000_000).toFixed(2)).replace(/\.00$/, "")
      : ""
  );
  const [rentMil, setRentMil] = useState<string>(
    listingType === "rent" && property?.rent_per_month
      ? String(Math.round(Number(property.rent_per_month) / 1_000_000))
      : ""
  );

  // Địa chỉ + contact
  const [ward, setWard] = useState<string>(property?.location?.ward ?? "");
  const [address, setAddress] = useState<string>(property?.location?.address ?? "");
  const [contactName, setContactName] = useState<string>(property?.contactInfo?.name ?? "");
  const [contactPhone, setContactPhone] = useState<string>(property?.contactInfo?.phone ?? "");
  const [contactEmail, setContactEmail] = useState<string>(property?.contactInfo?.email ?? "");
  const [ownerVerified, setOwnerVerified] = useState<boolean>(
    property?.contactInfo?.ownerVerified ?? (property?.verificationStatus === "verified") ?? false
  );

  // Ảnh BĐS
  const [images, setImages] = useState<string[]>(Array.isArray(property?.images) ? property.images : []);
  // Ảnh pháp lý
  const [legalImages, setLegalImages] = useState<string[]>(StorageManager.getLegalImages(property.id) || []);

  const filesToDataUrls = (files: FileList) =>
    Promise.all(
      Array.from(files).map(
        (f) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = reject;
            reader.readAsDataURL(f);
          })
      )
    );

  const addImages =
    (field: "images" | "legal", limit: number) =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || !files.length) return;
      const urls = await filesToDataUrls(files);
      if (field === "images") {
        setImages((prev) => [...prev, ...urls].slice(0, limit));
      } else {
        setLegalImages((prev) => [...prev, ...urls].slice(0, limit));
      }
      e.currentTarget.value = "";
    };

  const removeImage = (field: "images" | "legal", idx: number) => {
    if (field === "images") {
      setImages((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setLegalImages((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const onSave = () => {
    const now = new Date().toISOString();
    const provinceName =
      sortedProvinces.find((p) => p.provinceId === provinceId)?.provinceName || property?.location?.province || "";

    const updated: any = {
      ...property,
      title: title.trim(),
      description: description.trim(),
      propertyType,
      area: Number(area) || 0,
      listingType,
      images: images.slice(),
      location: {
        province: provinceName,
        district: property?.location?.district || "",
        ward: ward,
        address: address.trim(),
      },
      contactInfo: {
        ...(property?.contactInfo || {}),
        name: contactName.trim(),
        phone: contactPhone.trim(),
        email: contactEmail.trim(),
        ownerVerified,
      },
      // ⬇️ Trạng thái xác minh hiển thị
      verificationStatus: ownerVerified ? "verified" : "pending",
      updatedAt: now,
    };

    if (listingType === "sell") {
      const v = Number(String(priceTy).replace(",", "."));
      updated.price = isFinite(v) && v > 0 ? Math.round(v * 1_000_000_000) : 0;
      updated.price_per_m2 =
        updated.area > 0 && updated.price ? Math.round(updated.price / updated.area) : undefined;
      updated.rent_per_month = undefined;
    } else {
      const v = Number(String(rentMil).replace(",", "."));
      updated.rent_per_month = isFinite(v) && v > 0 ? Math.round(v * 1_000_000) : 0;
      updated.price = undefined;
      updated.price_per_m2 = undefined;
    }

    StorageManager.saveProperty(updated);
    StorageManager.saveLegalImages(property.id, legalImages);
    try {
      window.dispatchEvent(new CustomEvent("emyland:properties-changed"));
    } catch {}
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[998] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-lg">Sửa tin đăng</div>
          <button className="text-xl leading-none" onClick={onClose}>×</button>
        </div>

        <div className="space-y-5 max-h-[80vh] overflow-auto pr-1">
          {/* Hình thức */}
          <div>
            <div className="text-sm font-medium mb-1">Hình thức</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setListingType("sell")}
                className={`px-3 py-2 rounded-lg border shadow-sm ${listingType === "sell" ? "bg-amber-400 text-black border-amber-400" : "bg-white hover:bg-amber-50"}`}
              >
                Nhà đất bán
              </button>
              <button
                type="button"
                onClick={() => setListingType("rent")}
                className={`px-3 py-2 rounded-lg border shadow-sm ${listingType === "rent" ? "bg-amber-400 text-black border-amber-400" : "bg-white hover:bg-amber-50"}`}
              >
                Nhà đất cho thuê
              </button>
            </div>
          </div>

          {/* Cơ bản */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-sm font-medium mb-1">Tiêu đề</div>
              <input className="w-full rounded-md border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <div className="text-sm font-medium mb-1">Loại nhà đất</div>
              <select className="w-full rounded-md border px-3 py-2" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                <option value="">— Chọn loại —</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-sm font-medium mb-1">Diện tích (m²)</div>
              <input type="number" className="w-full rounded-md border px-3 py-2" value={area} onChange={(e) => setArea(e.target.value)} />
            </div>

            {listingType === "sell" ? (
              <div>
                <div className="text-sm font-medium mb-1">Giá bán (tỷ VND)</div>
                <input type="number" step="0.01" className="w-full rounded-md border px-3 py-2" value={priceTy} onChange={(e) => setPriceTy(e.target.value)} />
                <div className="text-xs text-gray-500 mt-1">Nhập theo tỷ VND.</div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium mb-1">Giá thuê (triệu/tháng)</div>
                <input type="number" step="0.1" className="w-full rounded-md border px-3 py-2" value={rentMil} onChange={(e) => setRentMil(e.target.value)} />
                <div className="text-xs text-gray-500 mt-1">Nhập theo triệu/tháng.</div>
              </div>
            )}
          </div>

          {/* Mô tả */}
          <div>
            <div className="text-sm font-medium mb-1">Mô tả</div>
            <textarea rows={4} className="w-full rounded-md border px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* Địa chỉ */}
          <div>
            <div className="text-sm font-semibold mb-2">Địa chỉ</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-sm font-medium mb-1">Tỉnh/Thành</div>
                <select
                  className="w-full rounded-md border px-3 py-2"
                  value={provinceId}
                  onChange={(e) => { setProvinceId(e.target.value); setWard(""); }}
                >
                  <option value="">— Chọn —</option>
                  {sortedProvinces.map((p) => (
                    <option key={p.provinceId} value={p.provinceId}>
                      {p.provinceName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Phường/Xã</div>
                <select
                  className="w-full rounded-md border px-3 py-2"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  disabled={!provinceId}
                >
                  <option value="">— Chọn —</option>
                  {wardOptions.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <div className="text-sm font-medium mb-1">Địa chỉ theo sổ đỏ/HĐMB</div>
                <input className="w-full rounded-md border px-3 py-2" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Liên hệ */}
          <div>
            <div className="text-sm font-semibold mb-2">Thông tin liên hệ</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-sm font-medium mb-1">Họ tên</div>
                <input className="w-full rounded-md border px-3 py-2" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Số điện thoại</div>
                <input className="w-full rounded-md border px-3 py-2" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Email</div>
                <input type="email" className="w-full rounded-md border px-3 py-2" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              </div>
            </div>
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={ownerVerified} onChange={(e) => setOwnerVerified(e.currentTarget.checked)} />
              <span>Đánh dấu <strong>đã xác minh chính chủ</strong>.</span>
            </label>
          </div>

          {/* Ảnh BĐS */}
          <div>
            <div className="text-sm font-semibold mb-2">Ảnh bất động sản</div>
            <input type="file" accept="image/*" multiple onChange={addImages("images", 10)} />
            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                {images.map((src, idx) => (
                  <div key={idx} className="relative">
                    <img src={src} alt={`img-${idx}`} className="h-28 w-full object-cover rounded-md border" />
                    <button
                      type="button"
                      onClick={() => removeImage("images", idx)}
                      className="absolute top-1 right-1 rounded bg-white/80 px-2 text-xs hover:bg-red-500 hover:text-white"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ảnh pháp lý */}
          <div>
            <div className="text-sm font-semibold mb-2">Ảnh pháp lý (sổ đỏ / HĐMB)</div>
            <input type="file" accept="image/*" multiple onChange={addImages("legal", 8)} />
            {legalImages.length > 0 && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
                {legalImages.map((src, idx) => (
                  <div key={idx} className="relative">
                    <img src={src} alt={`legal-${idx}`} className="h-24 w-full object-cover rounded-md border" />
                    <button
                      type="button"
                      onClick={() => removeImage("legal", idx)}
                      className="absolute top-1 right-1 rounded bg-white/80 px-2 text-xs hover:bg-red-500 hover:text-white"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Huỷ</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onSave}>Lưu thay đổi</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================= Trang Dashboard ======================= */
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

  // Modal sửa tin
  const [editProp, setEditProp] = useState<any | null>(null);

  useEffect(() => {
    const currentUser = StorageManager.getCurrentUser();
    if (!currentUser || !currentUser.isLoggedIn) {
      navigate("/login", { replace: true });
      return;
    }
    if (!currentUser.isAdmin) {
      navigate("/", { replace: true });
      return;
    }

    setUsers(StorageManager.getAllUsers());
    setProperties(StorageManager.getAllProperties());
    setLoading(false);
  }, [navigate]);

  const refreshUsers = () => setUsers(StorageManager.getAllUsers());
  const refreshProps = () => setProperties(StorageManager.getAllProperties());

  const handleDeleteUser = (email: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa người dùng này?")) {
      StorageManager.deleteUser(email);
      refreshUsers();
      refreshProps(); // tin của user cũng bị xoá
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
    const msg = next ? `Cấp quyền Quản trị cho ${u.fullName || u.email}?` : `Gỡ quyền Quản trị của ${u.fullName || u.email}?`;
    if (!window.confirm(msg)) return;
    StorageManager.saveUser({ ...u, isAdmin: next });

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

  const priceText = (p: any) => {
    const lt: ListingType = p?.listingType ?? (typeof p?.rent_per_month === "number" ? "rent" : "sell");
    if (lt === "rent") {
      const v = Number(p?.rent_per_month) || 0;
      return v ? `${Math.round(v / 1_000_000)} triệu/tháng` : "Thoả thuận";
    }
    const v = Number(p?.price) || 0;
    if (!v) return "Thoả thuận";
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} tỷ`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} triệu`;
    return v.toLocaleString();
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
    const imgs = StorageManager.getLegalImages(propId);
    if (!imgs?.length) {
      alert("Tin này chưa có ảnh pháp lý/HĐMB.");
      return;
    }
    setLegalImages(imgs);
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

        {/* Thống kê tổng quan */}
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
                          className={user.isAdmin ? "text-red-600 hover:text-red-700" : "bg-blue-600"}
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
              {filteredProps.map((property: any) => {
                const legalCount = StorageManager.getLegalImages(property.id)?.length ?? 0;
                const lt: ListingType =
                  property?.listingType ?? (typeof property?.rent_per_month === "number" ? "rent" : "sell");
                const isVerified =
                  property?.verificationStatus === "verified" || property?.contactInfo?.ownerVerified;

                return (
                  <Card key={property.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold line-clamp-1">{property.title}</h3>
                            <Badge className={lt === "sell" ? "bg-blue-600" : "bg-emerald-600"}>
                              {lt === "sell" ? "Nhà đất bán" : "Nhà đất cho thuê"}
                            </Badge>
                            {isVerified ? (
                              <Badge className="bg-emerald-600">Đã xác nhận chính chủ</Badge>
                            ) : (
                              <Badge className="bg-amber-500">Đang xác nhận chính chủ</Badge>
                            )}
                          </div>

                          <p className="text-gray-600 line-clamp-2">{property.description}</p>

                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                            <span>
                              Giá: <span className="font-semibold text-gray-900">{priceText(property)}</span>
                            </span>
                            <span>•</span>
                            <span>Diện tích: {property.area} m²</span>
                            <span>•</span>
                            <span>Đăng: {formatDate(property.createdAt)}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{property.propertyType}</Badge>
                            <span className="text-sm text-gray-500">bởi {property.userEmail}</span>
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
                            onClick={() => setEditProp(property)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Sửa
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

          {/* LOGS */}
          <TabsContent value="logs" className="space-y-6">
            <LogsContent />
          </TabsContent>
        </Tabs>
      </div>

      {Array.isArray(legalImages) && (
        <Lightbox images={legalImages} onClose={() => setLegalImages(null)} />
      )}

      {editProp && (
        <EditPropertyModal
          property={editProp}
          onClose={() => setEditProp(null)}
          onSaved={() => {
            refreshProps();
          }}
        />
      )}
    </AppLayout>
  );
};

export default SystemDashboard;
