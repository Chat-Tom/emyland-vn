// src/pages/SystemDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  StorageManager,
  type UserAccount,
  type PropertyListing,
} from "@utils/storage";
import { appendLog, getActorEmail } from "@/utils/log";
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
  Newspaper,
  Ban,
} from "lucide-react";
import LogsContent from "@/components/LogsContent";
import NewsAdminPanel from "@/components/admin/NewsAdminPanel";

/* ✅ Supabase (cloud-first) */
import { supabase } from "@/lib/supabase";

/* ======================= Helpers: phone-only ======================= */
const sanitizePhone = (v: string) => (v || "").replace(/\D+/g, "");
const normalizeVNPhone = (input: string) => {
  const digits = sanitizePhone(input);
  let normalized = digits.startsWith("84") ? "0" + digits.slice(2) : digits;
  if (normalized && normalized[0] !== "0") normalized = "0" + normalized;
  return normalized.slice(0, 10);
};
const isVNPhone10 = (v: string) =>
  /^(03|05|07|08|09)\d{8}$/.test(sanitizePhone(v));

/* ======================= UI helpers ======================= */
const BIG6 = [
  "Thành phố Hồ Chí Minh",
  "Thành phố Hà Nội",
  "Thành phố Đà Nẵng",
  "Thành phố Hải Phòng",
  "Thành phố Cần Thơ",
  "Thành phố Huế",
];
const wardWeight = (name: string) =>
  name.startsWith("Phường") ? 0 : name.startsWith("Xã") ? 1 : 2;

const vnDateString = (d?: string | number | Date) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
  } catch {
    return "";
  }
};

/* ===== Suy luận PN/WC & unify ===== */
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
const inferRooms = (p: any): { bedrooms?: number; bathrooms?: number } => {
  const bd = toPosInt(
    p?.bedrooms ??
      p?.bedroom ??
      p?.numBedrooms ??
      p?.rooms?.bedrooms ??
      p?.bedroom_count
  );
  let bt = toPosInt(
    p?.bathrooms ??
      p?.bathroom ??
      p?.numBathrooms ??
      p?.rooms?.bathrooms ??
      p?.bathroom_count ??
      p?.wc
  );
  if (bt === undefined) {
    bt = toPosInt(p?.WC ?? p?.toilet ?? p?.toilets ?? p?.toilet_count);
  }
  let bedrooms = bd;
  let bathrooms = bt;

  const hay = `${p?.title ?? ""} ${p?.description ?? ""} ${
    p?.summary ?? ""
  }`.toLowerCase();
  if (!bedrooms) {
    const m = hay.match(/(\d+)\s*(pn|phòng\s*ngủ|\bn\b)/i);
    if (m) bedrooms = Number(m[1]);
  }
  if (!bathrooms) {
    const m = hay.match(/(\d+)\s*(wc|vệ\s*sinh|vs)\b/i);
    if (m) bathrooms = Number(m[1]);
  }
  return { bedrooms, bathrooms };
};

function unifyProperty(row: any): any {
  const p: any = { ...row };
  p.createdAt = p.createdAt || p.created_at;
  p.updatedAt = p.updatedAt || p.updated_at || p.createdAt;
  p.userEmail = p.userEmail || p.user_email || p.ownerEmail;
  p.listingType =
    p.listingType ||
    p.listing_type ||
    (typeof p.rent_per_month === "number" ? "rent" : "sell");
  p.propertyType = p.propertyType || p.property_type;
  p.verificationStatus =
    p.verificationStatus ||
    p.verification_status ||
    (p.is_verified ? "verified" : "pending");
  if (!p.location) {
    p.location = {
      province: p.province,
      district: p.district,
      ward: p.ward,
      address: p.address,
    };
  }
  if (!p.contactInfo) {
    p.contactInfo = {
      name: p.ownerName,
      phone: p.ownerPhone,
      email: p.ownerEmail || p.userEmail,
      ownerVerified:
        p.is_verified || p.verified || p.verification_status === "verified",
      ownerVerifiedAt:
        p.ownerVerifiedAt ||
        p.owner_verified_at ||
        p.verifiedAt ||
        p.verified_at,
    };
  }
  if (!Array.isArray(p.images)) p.images = p.photos || p.gallery || [];
  return p;
}

/* ===== Audit log nhẹ ===== */
function logEvent(event: string, detail: any = {}) {
  try {
    const logs = JSON.parse(localStorage.getItem("emyland_logs") || "[]");
    logs.unshift({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      event,
      detail,
      actor: StorageManager.getCurrentUser?.()?.email || "unknown",
    });
    localStorage.setItem("emyland_logs", JSON.stringify(logs.slice(0, 500)));
    window.dispatchEvent?.(new Event("emyland:logs-updated"));
  } catch {}
}

/* ===== Siêu admin + danh sách BAN ===== */
const SUPER_ADMIN_EMAIL = "chat301277@gmail.com";
const BANNED_EMAILS_KEY = "emyland_banned_emails";
const BANNED_PHONES_KEY = "emyland_banned_phones";
const normEmail = (s?: string) => (s || "").trim().toLowerCase();
const normPhone = (s?: string) => (s || "").replace(/\D+/g, "");
function readBanned() {
  try {
    return {
      emails: JSON.parse(
        localStorage.getItem(BANNED_EMAILS_KEY) || "[]"
      ) as string[],
      phones: JSON.parse(
        localStorage.getItem(BANNED_PHONES_KEY) || "[]"
      ) as string[],
    };
  } catch {
    return { emails: [], phones: [] };
  }
}
function writeBanned(b: { emails: string[]; phones: string[] }) {
  try {
    localStorage.setItem(
      BANNED_EMAILS_KEY,
      JSON.stringify(Array.from(new Set(b.emails)))
    );
    localStorage.setItem(
      BANNED_PHONES_KEY,
      JSON.stringify(Array.from(new Set(b.phones)))
    );
    localStorage.setItem("emyland_banned_updated", String(Date.now()));
    window.dispatchEvent?.(new Event("emyland:banned-updated"));
  } catch {}
}

/* ======================= Component ======================= */
type ListingType = "sell" | "rent";

const SystemDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);

  const [userQuery, setUserQuery] = useState("");
  const [propQuery, setPropQuery] = useState("");
  const [legalImages, setLegalImages] = useState<string[] | null>(null);

  const sortByDateDesc = (a: any, b: any) => {
    const ad = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
    const bd = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
    return bd - ad;
  };

  const loadAllLocal = () => {
    setUsers(StorageManager.getAllUsers());
    const list = StorageManager.getAllProperties().slice().sort(sortByDateDesc);
    setProperties(list);
  };

  /* ✅ Kiểm tra quyền admin cloud-first (RPC) */
  const [cloudAdminChecked, setCloudAdminChecked] = useState(false);
  const [isAdminEffective, setIsAdminEffective] = useState(false);

  async function checkAdminCloudFirst(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc("rpc_am_i_admin");
      if (error) throw error;

      const cloudAdmin = !!data;
      setIsAdminEffective(cloudAdmin);
      return cloudAdmin;
    } catch (e) {
      console.error("checkAdminCloudFirst fatal:", e);
      // Fallback duy nhất: super-admin bằng email
      const me = StorageManager.getCurrentUser();
      const isSuper = normEmail(me?.email) === SUPER_ADMIN_EMAIL;
      setIsAdminEffective(isSuper);
      return isSuper;
    } finally {
      setCloudAdminChecked(true);
    }
  }

  const loadCloudProps = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const cloud = (data || []).map(unifyProperty);
      const local = StorageManager.getAllProperties() as any[];
      const map = new Map<string, any>();
      [...cloud, ...local].forEach((p: any) => map.set(String(p.id), p));
      const merged = Array.from(map.values()).sort(sortByDateDesc);
      setProperties(merged as PropertyListing[]);
    } catch (e) {
      console.error("Supabase fetch properties failed (keep local):", e);
    }
  };

  useEffect(() => {
    (async () => {
      const me = StorageManager.getCurrentUser();
      if (!me || !me.isLoggedIn) {
        navigate("/login", { replace: true });
        return;
      }

      const ok = await checkAdminCloudFirst();
      if (!ok) {
        navigate("/", { replace: true });
        return;
      }

      loadAllLocal();
      await loadCloudProps();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Tự refresh khi dữ liệu đổi
  useEffect(() => {
    const onChanged = () => {
      loadAllLocal();
      loadCloudProps();
    };
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === "emyland_properties" ||
        e.key === "emyland_properties_updated"
      ) {
        loadAllLocal();
        loadCloudProps();
      }
    };
    window.addEventListener(
      "emyland:properties-changed",
      onChanged as EventListener
    );
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(
        "emyland:properties-changed",
        onChanged as EventListener
      );
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const refreshUsers = () => setUsers(StorageManager.getAllUsers());
  const refreshProps = () => {
    setProperties(
      StorageManager.getAllProperties().slice().sort(sortByDateDesc)
    );
    loadCloudProps();
  };

  /* ====== Hành động ADMIN — server-first, local-sync ====== */

  const handleDeleteUser = async (email: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa người dùng này?")) return;

    try {
      // 1) Server: xoá user + cascade tin
      await supabase.rpc("rpc_admin_delete_user", {
        p_email: email.toLowerCase(),
      });
    } catch (e) {
      console.error("rpc_admin_delete_user failed:", e);
      // Fallback (giữ logic cũ, tránh phá luồng)
      try {
        await supabase.from("properties").delete().eq("user_email", email.toLowerCase());
      } catch {}
    }

    // 2) Local: đồng bộ UI
    StorageManager.deleteUser(email);
    try {
      appendLog({
        actorEmail: getActorEmail(StorageManager),
        target: "user",
        targetId: email,
        action: "delete",
        summary: "Xóa người dùng " + email,
      });
    } catch {}
    logEvent("user_delete", { email });

    // 3) Refresh
    refreshUsers();
    refreshProps();
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tin đăng này?")) return;

    try {
      await supabase.rpc("rpc_admin_delete_property", { p_id: propertyId });
    } catch (e) {
      console.error("rpc_admin_delete_property failed:", e);
      // Fallback an toàn
      try {
        await supabase.from("properties").delete().eq("id", propertyId);
      } catch {}
    }

    StorageManager.deleteProperty(propertyId);
    try {
      appendLog({
        actorEmail: getActorEmail(StorageManager),
        target: "property",
        targetId: propertyId,
        action: "delete",
        summary: "Xóa tin đăng " + propertyId,
      });
    } catch {}
    logEvent("property_delete", { id: propertyId });

    refreshProps();
  };

  const handleToggleAdmin = async (u: UserAccount) => {
    const next = !u.isAdmin;
    const msg = next
      ? `Cấp quyền Quản trị cho ${u.fullName || u.email}?`
      : `Gỡ quyền Quản trị của ${u.fullName || u.email}?`;
    if (!window.confirm(msg)) return;

    // 1) Server: set quyền
    try {
      await supabase.rpc("rpc_admin_set_admin", {
        p_phone: u.phone || null,
        p_email: u.email || null,
        p_is_admin: next,
      });
    } catch (e) {
      console.error("rpc_admin_set_admin failed:", e);
      alert("Không thể thay đổi quyền trên máy chủ. Vui lòng thử lại.");
      return;
    }

    // 2) Local: đồng bộ UI (không phá logic cũ)
    StorageManager.saveUser({ ...u, isAdmin: next });
    try {
      appendLog({
        actorEmail: getActorEmail(StorageManager),
        target: "user",
        targetId: u.email,
        action: "role_change",
        summary:
          (next ? "Cấp quyền Admin cho " : "Gỡ quyền Admin của ") +
          (u.fullName || u.email),
      });
    } catch {}
    logEvent(next ? "user_grant_admin" : "user_revoke_admin", {
      email: u.email,
    });

    // 3) Nếu gỡ quyền của chính mình → đăng xuất
    const cur = StorageManager.getCurrentUser();
    if (cur?.email === u.email && !next) {
      StorageManager.logout();
      alert("Bạn đã gỡ quyền Admin của chính mình. Phiên đăng nhập sẽ kết thúc.");
      navigate("/login", { replace: true });
      return;
    }

    refreshUsers();
  };

  /* ======= Hiển thị ======= */

  const trimTrailingZero = (s: string) => s.replace(/\.0\b/, "");
  const priceText = (p: any) => {
    const lt: ListingType =
      p?.listingType ?? (typeof p?.rent_per_month === "number" ? "rent" : "sell");
    if (lt === "rent") {
      const v = Number(p?.rent_per_month) || 0;
      return v > 0 ? `${Math.round(v / 1_000_000)} triệu/tháng` : "Thoả thuận";
    }
    const v = Number(p?.price) || 0;
    if (!v) return "Thoả thuận";
    if (v >= 1_000_000_000) return `${trimTrailingZero((v / 1_000_000_000).toFixed(1))} tỷ`;
    if (v >= 1_000_000) return `${Math.round(v / 1_000_000)} triệu`;
    return v.toLocaleString();
  };
  const areaText = (a?: any) => {
    if (a == null) return "--";
    const n =
      typeof a === "number"
        ? a
        : Number(String(a).replace(/[^\d.,]/g, "").replace(",", "."));
    if (!isFinite(n) || n <= 0) return "--";
    return n < 100 ? `${Math.round(n * 10) / 10} m²` : `${Math.round(n)} m²`;
  };

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return properties.filter(
      (p) => new Date(p.createdAt).toDateString() === today
    ).length;
  }, [properties]);
  const adminsCount = useMemo(
    () => users.filter((u) => u.isAdmin).length,
    [users]
  );
  const onlineCount = useMemo(
    () => users.filter((u) => u.isLoggedIn).length,
    [users]
  );

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
    const base = properties.slice().sort(sortByDateDesc);
    if (!propQuery.trim()) return base;
    const q = propQuery.trim().toLowerCase();
    return base.filter(
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

  /* ====== BAN state ====== */
  const [banned, setBanned] = useState<{ emails: string[]; phones: string[] }>(
    readBanned()
  );
  const isSuperAdmin =
    normEmail(StorageManager.getCurrentUser()?.email) === SUPER_ADMIN_EMAIL;
  const reloadBanned = () => setBanned(readBanned());

  const banEmail = async (email: string) => {
    const b = readBanned();
    b.emails.push(normEmail(email));
    writeBanned(b);
    setBanned(b);
    try {
      await supabase.from("bans").upsert({ email: normEmail(email) });
    } catch {}
  };
  const unbanEmail = (email: string) => {
    const b = readBanned();
    b.emails = b.emails.filter((x) => x !== normEmail(email));
    writeBanned(b);
    setBanned(b);
  };

  const banPhone = async (phone: string) => {
    const b = readBanned();
    b.phones.push(normPhone(phone));
    writeBanned(b);
    setBanned(b);
    try {
      await supabase.from("bans").upsert({ phone: normPhone(phone) });
    } catch {}
  };
  const unbanPhone = (phone: string) => {
    const b = readBanned();
    b.phones = b.phones.filter((x) => x !== normPhone(phone));
    writeBanned(b);
    setBanned(b);
  };

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === "emyland_banned_updated" ||
        e.key === BANNED_EMAILS_KEY ||
        e.key === BANNED_PHONES_KEY
      )
        reloadBanned();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(
      "emyland:banned-updated",
      reloadBanned as EventListener
    );
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "emyland:banned-updated",
        reloadBanned as EventListener
      );
    };
  }, []);

  if (loading || !cloudAdminChecked || !isAdminEffective) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-lg">Đang tải…</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quản lý hệ thống EmyLand
          </h1>
          <p className="text-gray-600">
            Quản lý người dùng và tin đăng trong hệ thống
          </p>
        </div>

        {/* Thống kê */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Tổng người dùng
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Home className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Tổng tin đăng
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {properties.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Tin đăng hôm nay
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {todayCount}
                  </p>
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
          <TabsList className="grid w-full grid-cols-4">
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
            <TabsTrigger value="news" className="flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              Tin tức (Tin mới)
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
                          {banned.emails.includes(normEmail(user.email)) && (
                            <Badge className="bg-red-600 text-white">Email bị chặn</Badge>
                          )}
                          {user.phone &&
                            banned.phones.includes(normPhone(user.phone)) && (
                              <Badge className="bg-red-600 text-white">SĐT bị chặn</Badge>
                            )}
                        </div>
                        <p className="text-gray-600">{user.email}</p>
                        {user.phone && <p className="text-gray-600">{user.phone}</p>}
                        <p className="text-sm text-gray-500">
                          Đăng ký:{" "}
                          {(() => {
                            try {
                              return new Date(user.registeredAt).toLocaleDateString(
                                "vi-VN",
                                { timeZone: "Asia/Ho_Chi_Minh" }
                              );
                            } catch {
                              return "";
                            }
                          })()}
                        </p>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant={user.isAdmin ? "outline" : "default"}
                          size="sm"
                          className={
                            user.isAdmin
                              ? "text-red-600 hover:text-red-700"
                              : "bg-blue-600"
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

                        {isSuperAdmin && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const fullName =
                                  window.prompt("Họ tên", user.fullName || "") ??
                                  user.fullName;
                                const phone =
                                  window.prompt("SĐT", user.phone || "") ??
                                  user.phone;
                                const email =
                                  window.prompt("Email", user.email || "") ??
                                  user.email;
                                StorageManager.saveUser({
                                  ...user,
                                  fullName: (fullName || "").trim() || user.fullName,
                                  phone: (phone || "").trim() || user.phone,
                                  email: (email || "").trim() || user.email,
                                });
                                logEvent("user_update_admin", {
                                  from: user.email,
                                  to: email,
                                });
                                refreshUsers();
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Sửa
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className={
                                banned.emails.includes(normEmail(user.email))
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              }
                              onClick={() => {
                                if (banned.emails.includes(normEmail(user.email))) {
                                  unbanEmail(user.email);
                                } else if (
                                  window.confirm(`Chặn VĨNH VIỄN email ${user.email}?`)
                                ) {
                                  banEmail(user.email);
                                }
                              }}
                              title="Chặn/Bỏ chặn theo Email"
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              {banned.emails.includes(normEmail(user.email))
                                ? "Bỏ chặn email"
                                : "Chặn email"}
                            </Button>

                            {user.phone && (
                              <Button
                                variant="outline"
                                size="sm"
                                className={
                                  banned.phones.includes(normPhone(user.phone))
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                }
                                onClick={() => {
                                  if (banned.phones.includes(normPhone(user.phone))) {
                                    unbanPhone(user.phone);
                                  } else if (
                                    window.confirm(`Chặn VĨNH VIỄN số ${user.phone}?`)
                                  ) {
                                    banPhone(user.phone);
                                  }
                                }}
                                title="Chặn/Bỏ chặn theo SĐT"
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                {banned.phones.includes(normPhone(user.phone))
                                  ? "Bỏ chặn SĐT"
                                  : "Chặn SĐT"}
                              </Button>
                            )}
                          </>
                        )}

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
                const legalCount =
                  StorageManager.getLegalImages(property.id)?.length ?? 0;
                const lt: ListingType =
                  property?.listingType ??
                  (typeof property?.rent_per_month === "number" ? "rent" : "sell");
                const isVerified =
                  property?.verificationStatus === "verified" ||
                  property?.contactInfo?.ownerVerified;

                const { bedrooms, bathrooms } = inferRooms(property);

                return (
                  <Card key={property.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold line-clamp-1">
                              {property.title}
                            </h3>
                            <Badge
                              className={
                                lt === "sell" ? "bg-blue-600" : "bg-emerald-600"
                              }
                            >
                              {lt === "sell" ? "Nhà đất bán" : "Nhà đất cho thuê"}
                            </Badge>
                            {isVerified ? (
                              <Badge className="bg-emerald-600">
                                {(() => {
                                  const t =
                                    property?.verifiedAt ||
                                    property?.verified_at ||
                                    property?.contactInfo?.ownerVerifiedAt ||
                                    property?.contactInfo?.owner_verified_at;
                                  const d = vnDateString(t);
                                  return d
                                    ? `Đã xác nhận chính chủ ngày ${d}`
                                    : "Đã xác nhận chính chủ";
                                })()}
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500">
                                Đang xác nhận chính chủ
                              </Badge>
                            )}
                          </div>

                          <p className="text-gray-600 line-clamp-2">
                            {property.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                            <span>
                              Giá:{" "}
                              <span className="font-semibold text-gray-900">
                                {priceText(property)}
                              </span>
                            </span>
                            <span>•</span>
                            <span>Diện tích: {areaText(property.area)}</span>

                            {typeof bedrooms === "number" && (
                              <>
                                <span>•</span>
                                <span>{bedrooms}N</span>
                              </>
                            )}
                            {typeof bathrooms === "number" && (
                              <>
                                <span>•</span>
                                <span>{bathrooms}WC</span>
                              </>
                            )}

                            <span>•</span>
                            <span>Đăng: {vnDateString(property.createdAt)}</span>
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
                            onClick={() => navigate(`/post-property?id=${property.id}`)}
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

          {/* NEWS */}
          <TabsContent value="news" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Tin tức (Tin mới)</h2>
              <Button
                variant="outline"
                onClick={() => window.open("/news", "_blank")}
                title="Mở trang Tin mới (công khai)"
              >
                Xem trang Tin mới
              </Button>
            </div>

            <div className="news-editor">
              <NewsAdminPanel />
            </div>

            <style>{`
              @media (max-width: 480px){
                .news-editor .ai-row { gap: .5rem; }
                .news-editor .ai-row > button { height: 34px; padding: 0 10px; }
              }
            `}</style>
          </TabsContent>
        </Tabs>
      </div>

      {Array.isArray(legalImages) && (
        <div
          className="fixed inset-0 z-[999] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setLegalImages(null)}
        >
          <div
            className="bg-white rounded-xl max-w-5xl w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Ảnh pháp lý / HĐMB</div>
              <button
                className="text-xl leading-none"
                onClick={() => setLegalImages(null)}
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[70vh] overflow-auto">
              {legalImages.map((src, i) => (
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
      )}
    </AppLayout>
  );
};

export default SystemDashboard;
