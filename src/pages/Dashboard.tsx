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
import { User, Home, Edit, Trash2, Eye, Plus, Camera, Mail, ShieldCheck, Hourglass } from "lucide-react";
import { postDateLabel, renderVerifiedAt } from "@utils/date";
import { StorageManager } from "@utils/storage";
import type { UserAccount, PropertyListing } from "@utils/storage";

/* ✅ THÊM: đọc cloud */
import { supabase } from "@/lib/supabase";

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

// ===== helpers =====
type ListingType = "sell" | "rent";

const listingTypeOf = (p: any): ListingType =>
  (p?.listingType as ListingType) ??
  (typeof p?.rent_per_month === "number" ? "rent" : "sell");

const priceText = (p: any) => {
  const lt = listingTypeOf(p);
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

type Verify = "verified" | "pending";
const verifyStatusOf = (p: any): Verify => {
  const vs = String(p?.verificationStatus || p?.verification_status || "").toLowerCase();
  if (vs.includes("verified") || vs.includes("đã xác nhận")) return "verified";
  if (vs.includes("pending") || vs.includes("đang xác nhận")) return "pending";
  if (p?.contactInfo?.ownerVerified === true || p?.is_verified === true) return "verified";
  return "pending";
};

// Việt hoá loại BĐS (chỉ hiển thị)
const TYPE_LABELS: Record<string, string> = {
  apartment: "Căn hộ",
  house: "Nhà phố",
  villa: "Biệt thự",
  office: "Văn phòng",
  land: "Nhà đất",
  social: "Nhà ở xã hội",
};

// Ép & suy luận số phòng
const toPosInt = (v: any): number | undefined => {
  if (typeof v === "number" && v > 0) return Math.round(v);
  if (typeof v === "string") {
    const m = v.match(/\d+/);
    if (m) {
      const n = Number(m[0]);
      if (n > 0) return n;
    }
  }
  return undefined;
};
const deburrLower = (s?: string) => {
  if (!s) return "";
  try { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
  catch { return String(s).toLowerCase().trim(); }
};
function inferRooms(p: any): { bedrooms?: number; bathrooms?: number } {
  let bedrooms = toPosInt(p?.bedrooms ?? p?.bedroom ?? p?.numBedrooms ?? p?.rooms?.bedrooms ?? p?.bedroom_count);
  let bathrooms = toPosInt(p?.bathrooms ?? p?.bathroom ?? p?.numBathrooms ?? p?.rooms?.bathrooms ?? p?.bathroom_count ?? p?.wc);

  if (!bedrooms || !bathrooms) {
    const hay = deburrLower([p?.title, p?.description, p?.summary].filter(Boolean).join(" "));
    if (!bedrooms) {
      const m = hay.match(/(\d+)\s*(pn|phong\s*ngu|\bn\b)/i);
      if (m) bedrooms = Number(m[1]);
    }
    if (!bathrooms) {
      const m = hay.match(/(\d+)\s*(wc|ve\s*sinh|vs)\b/i);
      if (m) bathrooms = Number(m[1]);
    }
  }
  return { bedrooms, bathrooms };
}

/* ========= FIX CAP 4 TIN: đọc toàn bộ rồi lọc theo email/phone ========= */
const normalizePhone = (s?: string) => (s || "").replace(/\D+/g, "");
const normalizeEmail = (s?: string) => (s || "").trim().toLowerCase();

const listMyProperties = (u: UserAccount): PropertyListing[] => {
  const email = normalizeEmail(u.email);
  const phone = normalizePhone(u.phone);

  const all: any[] =
    (typeof (StorageManager as any).getAllProperties === "function"
      ? (StorageManager as any).getAllProperties()
      : JSON.parse(localStorage.getItem("emyland_properties") || "[]")) || [];

  const mine = all.filter((p: any) => {
    const pe = normalizeEmail(p.userEmail || p.ownerEmail || p.contactInfo?.email || p.user_email);
    const pp = normalizePhone(p.userPhone || p.ownerPhone || p.contactInfo?.phone);
    return (email && pe === email) || (phone && pp === phone);
  });

  mine.sort((a, b) => {
    const ta = new Date(a?.createdAt || a?.updatedAt || a?.created_at || a?.updated_at || 0).getTime();
    const tb = new Date(b?.createdAt || b?.updatedAt || b?.created_at || b?.updated_at || 0).getTime();
    return tb - ta;
  });

  return mine as PropertyListing[];
};

/** 🔧 Helper: lấy ảnh pháp lý đã lưu cho tin */
function getLegalImagesById(id?: string): string[] {
  if (!id) return [];
  try {
    const fromSM = (StorageManager as any).getLegalImages?.(id);
    if (Array.isArray(fromSM)) return fromSM;
  } catch {}
  try {
    const raw = localStorage.getItem(`emyland_property_legal_${id}`);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** 🔧 Ẩn checkbox “Đánh dấu Nổi bật” trong modal Sửa (không sửa modal) */
function hideFeaturedFieldInModal() {
  try {
    setTimeout(() => {
      const containers = Array.from(document.querySelectorAll<HTMLElement>(".fixed, [role='dialog'], .ReactModal__Content"));
      containers.forEach((root) => {
        const all = Array.from(root.querySelectorAll<HTMLElement>("label, div, span, p"));
        for (const el of all) {
          const txt = (el.textContent || "").trim();
          if (/^đánh dấu\s*nổi bật$/i.test(txt) || (/nổi bật/i.test(txt) && /đánh dấu/i.test(txt))) {
            const wrapper = el.closest("div") || el.parentElement;
            if (wrapper) (wrapper as HTMLElement).style.display = "none";
          }
        }
      });
    }, 0);
  } catch {}
}

/* ====================== THÊM: Cloud helpers ======================= */
/** Map dòng DB → shape FE đang dùng (giữ nguyên field cũ để UI không đổi) */
function mapDbRow(row: any): any {
  return {
    ...row,
    id: row.id,
    title: row.title,
    description: row.description,
    images: Array.isArray(row.images) ? row.images : [],
    area: row.area ?? row.size,
    propertyType: row.property_type ?? row.propertyType,
    listingType: row.listing_type ?? row.listingType,
    price: row.price ?? row.sale_price,
    rent_per_month: row.rent_per_month,
    bedrooms: row.bedrooms ?? row.bedroom_count,
    bathrooms: row.bathrooms ?? row.bathroom_count ?? row.wc,
    province: row.province,
    ward: row.ward,
    address: row.address,
    verificationStatus: row.verification_status ?? row.verificationStatus ?? "pending",
    is_verified: row.is_verified ?? false,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

/** Lấy tin của tôi từ Supabase theo user_email */
async function fetchCloudByEmail(email?: string): Promise<any[]> {
  const em = normalizeEmail(email);
  if (!em) return [];
  try {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("user_email", em)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Supabase select error:", error);
      return [];
    }
    return (data || []).map(mapDbRow);
  } catch (e) {
    console.error("Supabase select exception:", e);
    return [];
  }
}

/** Hợp nhất danh sách local + cloud theo id; ưu tiên bản có updatedAt mới hơn */
function mergeByIdPreferNewer(localList: any[], cloudList: any[]) {
  const pick = new Map<string, any>();
  const push = (arr: any[]) => {
    for (const it of arr) {
      const id = String(it?.id || "");
      if (!id) continue;
      const prev = pick.get(id);
      if (!prev) {
        pick.set(id, it);
      } else {
        const ta = new Date(prev.updatedAt || prev.createdAt || 0).getTime();
        const tb = new Date(it.updatedAt || it.createdAt || 0).getTime();
        pick.set(id, tb >= ta ? { ...prev, ...it } : prev);
      }
    }
  };
  push(localList);
  push(cloudList);
  return Array.from(pick.values()).sort((a, b) => {
    const ta = new Date(a.createdAt || a.updatedAt || 0).getTime();
    const tb = new Date(b.createdAt || b.updatedAt || 0).getTime();
    return tb - ta;
  });
}
/* ==================== END Cloud helpers ==================== */

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

  // 🔁 THÊM: hàm refresh cloud-first (gọi được ở nhiều nơi)
  const refreshMine = async (u: UserAccount) => {
    const localMine = listMyProperties(u);
    const cloudMine = await fetchCloudByEmail(u.email);
    setProperties(mergeByIdPreferNewer(localMine, cloudMine));
  };

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

      // ⛳ Giữ logic cũ: hiển thị ngay dữ liệu local
      setProperties(listMyProperties(parsedUser));

      // ✅ THÊM: sau đó tải cloud và hợp nhất (không chặn UI)
      refreshMine(parsedUser).finally(() => setLoading(false));
      return;
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      navigate("/login");
    } finally {
      // nếu đã gọi refreshMine, phần này chỉ để an toàn khi lỗi parse
      setLoading(false);
    }
  }, [navigate]);

  // Nghe sự kiện global khi user cập nhật (từ UserEditModal)
  useEffect(() => {
    const onUserUpdated = () => {
      const data = localStorage.getItem("emyland_user");
      if (data) {
        try {
          const u = JSON.parse(data) as UserAccount;
          setUser(u);
          // Đồng bộ lại danh sách tin
          refreshMine(u);
        } catch {}
      }
    };
    window.addEventListener("emyland:userUpdated", onUserUpdated as EventListener);
    return () => window.removeEventListener("emyland:userUpdated", onUserUpdated as EventListener);
  }, []);

  // Tự refresh danh sách tin khi có sự kiện thay đổi hệ thống
  useEffect(() => {
    const onChanged = () => { if (user) refreshMine(user); };
    window.addEventListener("emyland:properties-changed", onChanged as EventListener);
    window.addEventListener("storage", (e: any) => {
      if (e?.key === "emyland_properties_updated" || e?.key === "emyland_properties") {
        if (user) refreshMine(user);
      }
    });
    return () => window.removeEventListener("emyland:properties-changed", onChanged as EventListener);
  }, [user]);

  const handleDeleteProperty = async (propertyId: string) => {
    if (!propertyId) return;
    if (window.confirm("Bạn có chắc chắn muốn xóa tin đăng này?")) {
      // Giữ logic cũ: xoá local
      StorageManager.deleteProperty(propertyId);
      if (user) setProperties(listMyProperties(user));

      // ✅ THÊM: xoá trên Supabase (không chặn luồng nếu lỗi)
      try {
        const { error } = await supabase.from("properties").delete().eq("id", propertyId);
        if (error) console.error("Supabase delete error:", error);
      } catch (e) {
        console.error("Supabase delete exception:", e);
      }

      // Sau xoá: refresh cloud-first để đồng bộ
      if (user) refreshMine(user);
    }
  };

  const handleEditProperty = (property: PropertyListing) => {
    // ✅ Prefill ảnh pháp lý khi mở sửa
    const legalImages = getLegalImagesById(property.id);
    const merged: any = { ...property, legalImages: Array.isArray(legalImages) ? legalImages : [] };
    setEditingProperty(merged);
    setIsEditModalOpen(true);
  };

  // ✅ Khi mở modal: ẩn trường "Đánh dấu Nổi bật"
  useEffect(() => {
    if (isEditModalOpen) hideFeaturedFieldInModal();
  }, [isEditModalOpen, editingProperty?.id]);

  const handleSaveProperty = () => {
    // Giữ cũ + THÊM refresh cloud
    if (user) refreshMine(user);
  };

  const handleSaveUser = () => {
    const userData = localStorage.getItem("emyland_user");
    if (userData) {
      const u = JSON.parse(userData) as UserAccount;
      setUser(u);
      if (u) refreshMine(u);
    }
  };

  // ==== Avatar: click ảnh để đổi (bỏ nút riêng) ====
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        window.dispatchEvent(new Event("emyland:userUpdated"));
        alert("Đã cập nhật ảnh đại diện!");
      }
    } catch (err) {
      console.error(err);
      alert("Không thể cập nhật ảnh. Vui lòng thử lại.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Dùng nhãn "hôm nay / hôm qua / dd/mm/yyyy"
  const renderPosted = (dateString: string) => {
    const label = postDateLabel(dateString);
    return label ? `Đăng: ${label}` : "";
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
      {/* Full viewport height + padding hợp lý cho mobile/desktop */}
      <section className="min-h-[100svh] px-4 md:px-6">
        {/* Khối nội dung căn giữa ngang (max-w) và có khoảng đệm trên/dưới */}
        <div className="mx-auto max-w-5xl py-6 md:py-10">
          <div className="mb-8 text-center sm:text-left">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">Quản lý tài khoản và tin đăng của bạn</p>
          </div>

          <Tabs defaultValue="properties" className="space-y-6">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-center sm:text-left">
                <h2 className="text-2xl font-semibold">
                  Tin đăng của tôi ({properties.length})
                </h2>
                <div className="flex items-center justify-center sm:justify-end gap-2">
                  <Button variant="outline" onClick={() => navigate("/")}>
                    Quay về trang chủ
                  </Button>
                  <Button onClick={() => navigate("/post-property")} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Đăng tin mới
                  </Button>
                </div>
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
                  {properties.map((property) => {
                    const lt = listingTypeOf(property);
                    const vStatus = verifyStatusOf(property);
                    const typeLabel =
                      TYPE_LABELS[String(property.propertyType || "").toLowerCase()] ||
                      property.propertyType ||
                      "Nhà đất";

                    const { bedrooms, bathrooms } = inferRooms(property);

                    return (
                      <Card key={property.id} className="overflow-hidden">
                        <CardContent className="p-6">
                          <div className="flex gap-6">
                            <div className="w-48 h-32 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                              {property.images && property.images.length > 0 ? (
                                <img
                                  src={property.images[0]}
                                  alt={property.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <Home className="h-8 w-8" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2 gap-2">
                                <div className="min-w-0">
                                  <h3 className="text-xl font-semibold text-gray-900 line-clamp-2">
                                    {property.title}
                                  </h3>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary">{typeLabel}</Badge>
                                    <Badge className={lt === "sell" ? "bg-blue-600" : "bg-emerald-600"}>
                                      {lt === "sell" ? "Nhà đất bán" : "Nhà đất cho thuê"}
                                    </Badge>

                                    {vStatus === "verified" ? (
                                      <Badge className="bg-emerald-600 inline-flex items-center gap-1.5">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        {renderVerifiedAt(property) || "Đã xác nhận chính chủ"}
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-amber-500 inline-flex items-center gap-1.5">
                                        <Hourglass className="w-3.5 h-3.5" />
                                        Đang xác nhận chính chủ
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <p className="text-gray-600 mb-2 line-clamp-2">{property.description}</p>

                              {/* Thông tin ngắn: Diện tích • N • WC • Đăng: … */}
                              <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                <span>Diện tích: {property.area ?? "--"}m²</span>
                                {typeof bedrooms === "number" && <span>• {bedrooms}N</span>}
                                {typeof bathrooms === "number" && <span>• {bathrooms}WC</span>}
                                <span>• {renderPosted((property as any).createdAt || (property as any).created_at)}</span>
                              </div>

                              <div className="flex justify-between items-center">
                                <div className="text-2xl font-bold text-red-600">
                                  {priceText(property)} {lt === "sell" ? "VND" : ""}
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-1"
                                    onClick={() => navigate(`/property/${property.id}`)}
                                  >
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
                    );
                  })}
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

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onAvatarSelected}
                      />

                      <div className="hidden md:block text-sm text-gray-500">
                        Nhấp vào ảnh để đổi ảnh đại diện
                      </div>
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

          {/* Modal sửa tin: ẩn quyền xác minh đối với user thường */}
          {/* @ts-ignore */}
          <PropertyEditModal
            property={editingProperty}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleSaveProperty}
            canVerify={false}
          />

          <UserEditModal
            user={user}
            isOpen={isUserEditModalOpen}
            onClose={() => setIsUserEditModalOpen(false)}
            onSave={handleSaveUser}
          />
        </div>
      </section>
    </AppLayout>
  );
};

export default Dashboard;
