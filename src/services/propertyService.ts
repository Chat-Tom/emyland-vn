// src/services/PropertyService.ts
import { supabase } from "@/lib/supabase";

/* ======================= Types (giữ nguyên) ======================= */
export interface Property {
  id: string;
  created_at: string;
  title: string;
  description: string;
  province: string;
  ward: string;
  location: string;
  area: number;
  price: number;
  price_per_m2?: number;
  rent_per_month?: number;
  images: string[];
  phone: string;
  is_verified?: boolean;
  type?: string;
  listingType?: "sell" | "rent";
}

export interface PropertyFilters {
  province?: string;
  ward?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  type?: string;
  listingType?: "sell" | "rent";
}

type PagedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

/* ======================= utils chung ======================= */
function toNum(v: any): number | undefined {
  if (v === null || v === undefined || v === "" || Number.isNaN(v)) return undefined;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function normalizeImages(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string") {
    try {
      const arr = JSON.parse(v);
      if (Array.isArray(arr)) return arr.filter(Boolean);
    } catch {
      return v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  if (typeof v === "object" && Array.isArray((v as any).urls)) {
    return (v as any).urls.filter(Boolean);
  }
  return [];
}

const LS_KEY = "emyland_properties";

/** Bỏ tiền tố “Thành phố”, “Tỉnh”, “TP.” để so sánh/tìm kiếm */
const normalizeProvince = (raw?: string): string =>
  (raw ?? "")
    .replace(/^\s*Thành\s*phố\s+/i, "")
    .replace(/^\s*Tỉnh\s+/i, "")
    .replace(/^\s*TP\.\s*/i, "")
    .trim();

/** Map text loại BĐS từ form cũ → code app (apartment/house/villa/office/land) */
function mapPropertyTypeToCode(label?: string): string | undefined {
  const s = (label ?? "").toLowerCase();
  if (!s) return undefined;
  if (s.includes("căn hộ")) return "apartment";
  if (s.includes("nhà đất riêng") || s.includes("nhà riêng") || s.includes("nhà phố")) return "house";
  if (s.includes("biệt thự")) return "villa";
  if (s.includes("văn phòng")) return "office";
  return "land";
}

/** Chuẩn hoá object property lưu trong localStorage về interface Property */
function mapLocalToProperty(p: any): Property {
  const province = normalizeProvince(p?.location?.province ?? p?.province);
  const ward = p?.location?.ward ?? p?.ward ?? "";
  const district = p?.location?.district ?? p?.district ?? "";
  const address = p?.location?.address ?? p?.address ?? "";
  const location = [address, district, ward, province].filter(Boolean).join(", ");

  const area = Number(p?.area ?? 0) || 0;
  const price = Number(p?.price ?? 0) || 0;
  const ppm = area > 0 && price ? Math.round(price / area) : undefined;

  return {
    id: String(p?.id ?? p?._id ?? `${Date.now()}-${Math.random()}`),
    created_at: p?.createdAt ?? p?.created_at ?? new Date().toISOString(),
    title: p?.title ?? "Tin đăng bất động sản",
    description: p?.description ?? "",
    province,
    ward,
    location,
    area,
    price,
    price_per_m2: p?.price_per_m2 ?? ppm,
    rent_per_month: p?.rent_per_month ? Number(p?.rent_per_month) : undefined,
    images: Array.isArray(p?.images) ? p.images : normalizeImages(p?.images),
    phone: p?.contactInfo?.phone ?? p?.phone ?? "",
    is_verified: !!(p?.contactInfo?.ownerVerified ?? p?.is_verified),
    type: p?.type ?? mapPropertyTypeToCode(p?.propertyType),
    // Tin đăng local hiện tại mặc định là BÁN (có thể mở rộng sau)
    listingType: p?.listingType ?? "sell",
  };
}

/** Đọc tất cả tin local & chuẩn hoá */
function readLocal(): Property[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.map(mapLocalToProperty);
  } catch {
    return [];
  }
}

/** Lọc theo filters phía client cho mảng Property */
function filterClient(items: Property[], filters?: PropertyFilters): Property[] {
  if (!filters) return items;

  const { province, ward, minPrice, maxPrice, minArea, maxArea, type, listingType } = filters;

  let out = items.slice();

  if (province && province.trim()) {
    const pv = normalizeProvince(province.trim());
    out = out.filter(
      (x) =>
        normalizeProvince(x.province) === pv ||
        (x.location ?? "").toLowerCase().includes(pv.toLowerCase())
    );
  }

  if (ward && ward.trim()) {
    const w = ward.trim().toLowerCase();
    out = out.filter((x) => (x.ward ?? "").toLowerCase().includes(w));
  }

  if (type && type !== "all") out = out.filter((x) => (x.type ?? "") === type);

  if (listingType) {
    out = out.filter((x) => {
      const lt = x.listingType ?? (typeof x.rent_per_month === "number" ? "rent" : "sell");
      return lt === listingType;
    });
  }

  const pmin = toNum(minPrice);
  const pmax = toNum(maxPrice);
  const priceCol = (listingType === "rent" ? "rent_per_month" : "price") as
    | "rent_per_month"
    | "price";
  if (typeof pmin === "number") out = out.filter((x) => (x[priceCol] ?? 0) >= pmin);
  if (typeof pmax === "number") out = out.filter((x) => (x[priceCol] ?? 0) <= pmax);

  const amin = toNum(minArea);
  const amax = toNum(maxArea);
  if (typeof amin === "number") out = out.filter((x) => (x.area ?? 0) >= amin);
  if (typeof amax === "number") out = out.filter((x) => (x.area ?? 0) <= amax);

  return out;
}

/** Hợp nhất 2 mảng theo id (ưu tiên bản có created_at mới hơn) */
function mergeUniqueById(a: Property[], b: Property[]): Property[] {
  const map = new Map<string, Property>();
  const put = (x: Property) => {
    const old = map.get(x.id);
    if (!old) {
      map.set(x.id, x);
    } else {
      const ta = Date.parse(old.created_at || "");
      const tb = Date.parse(x.created_at || "");
      map.set(x.id, tb >= ta ? x : old);
    }
  };
  a.forEach(put);
  b.forEach(put);
  return Array.from(map.values());
}

/** Sắp xếp mới nhất trước */
function sortNewest(items: Property[]): Property[] {
  return items
    .slice()
    .sort((x, y) => Date.parse(y.created_at || "") - Date.parse(x.created_at || ""));
}

/* ======================= Service ======================= */
export class PropertyService {
  /** Query Supabase (KHÔNG còn lọc listingType phía server để tránh lỗi cột) */
  private static buildQuery(filters?: PropertyFilters) {
    let q = supabase.from("properties").select("*", { count: "exact" });

    if (!filters) return q.order("created_at", { ascending: false });

    const { province, ward, minPrice, maxPrice, minArea, maxArea, type, listingType } = filters;

    // Province/City: OR theo cả province và location cho linh hoạt
    if (province && province.trim()) {
      const like = `%${province.trim()}%`;
      q = q.or(`province.ilike.${like},location.ilike.${like}`);
    }

    if (ward && ward.trim()) q = q.ilike("ward", `%${ward.trim()}%`);
    if (type && type !== "all") q = q.eq("type", type);

    // ❗ Không dùng listingType ở server vì có DB chỉ có 'listing_type'
    // Nếu vẫn muốn lọc theo giá, chọn cột dựa vào listingType
    const minP = toNum(minPrice);
    const maxP = toNum(maxPrice);
    const priceColumn = listingType === "rent" ? "rent_per_month" : "price";
    if (typeof minP === "number") q = q.gte(priceColumn, minP);
    if (typeof maxP === "number") q = q.lte(priceColumn, maxP);

    // Diện tích
    const minA = toNum(minArea);
    const maxA = toNum(maxArea);
    if (typeof minA === "number") q = q.gte("area", minA);
    if (typeof maxA === "number") q = q.lte("area", maxA);

    return q.order("created_at", { ascending: false });
  }

  /** Lấy list (không phân trang) + trộn local → đảm bảo trang chủ thấy “tin mới nhất” */
  static async getProperties(filters?: PropertyFilters): Promise<Property[]> {
    try {
      const query = this.buildQuery(filters);
      const { data, error } = await query.limit(50);
      if (error) {
        console.error("Supabase error(getProperties):", error?.message ?? error, error);
      }

      let remote: Property[] = (Array.isArray(data) ? data : []).map((item: any) => ({
        ...item,
        created_at: String(item?.created_at ?? new Date().toISOString()),
        price: Number(item?.price) || 0,
        area: Number(item?.area) || 0,
        rent_per_month: Number(item?.rent_per_month) || undefined,
        price_per_m2: Number(item?.price_per_m2) || undefined,
        listingType: (item?.listing_type ?? item?.listingType) as "sell" | "rent" | undefined,
        is_verified:
            typeof item?.is_verified === "boolean" ? item.is_verified : item?.is_verified === 1,
        images: normalizeImages(item?.images),
      }));

      // Bổ sung lọc listingType phía client (an toàn với mọi schema)
      if (filters?.listingType) {
        const want = filters.listingType;
        remote = remote.filter((x) => (x.listingType ?? (x.rent_per_month ? "rent" : "sell")) === want);
      }

      const localAll = readLocal();
      const localFiltered = filterClient(localAll, filters);

      // Hợp nhất + sắp xếp + giới hạn 50
      return sortNewest(mergeUniqueById(remote, localFiltered)).slice(0, 50);
    } catch (err) {
      console.error("Get properties error:", err);
      // Fallback: chỉ local
      return sortNewest(filterClient(readLocal(), filters)).slice(0, 50);
    }
  }

  /** Lấy list có phân trang + trộn local, trả total/hasMore chính xác */
  static async getPropertiesPaged(
    filters?: PropertyFilters,
    opts?: { page?: number; pageSize?: number }
  ): Promise<PagedResult<Property>> {
    const page = Math.max(1, opts?.page ?? 1);
    const pageSize = Math.min(Math.max(1, opts?.pageSize ?? 24), 200);

    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const query = this.buildQuery(filters).range(from, to);
      const { data, error, count } = await query;
      if (error) {
        console.error("Supabase error(getPropertiesPaged):", error?.message ?? error, error);
      }

      let remote: Property[] = (Array.isArray(data) ? data : []).map((item: any) => ({
        ...item,
        created_at: String(item?.created_at ?? new Date().toISOString()),
        price: Number(item?.price) || 0,
        area: Number(item?.area) || 0,
        rent_per_month: Number(item?.rent_per_month) || undefined,
        price_per_m2: Number(item?.price_per_m2) || undefined,
        listingType: (item?.listing_type ?? item?.listingType) as "sell" | "rent" | undefined,
        is_verified:
            typeof item?.is_verified === "boolean" ? item.is_verified : item?.is_verified === 1,
        images: normalizeImages(item?.images),
      }));

      // Lọc listingType phía client nếu cần
      if (filters?.listingType) {
        const want = filters.listingType;
        remote = remote.filter((x) => (x.listingType ?? (x.rent_per_month ? "rent" : "sell")) === want);
      }

      const localAll = readLocal();
      const localFiltered = filterClient(localAll, filters);

      // Hợp nhất & sắp xếp
      const merged = sortNewest(mergeUniqueById(remote, localFiltered));

      // Tính total: tổng Supabase (count) + số local không trùng id Supabase
      const remoteIdSet = new Set(remote.map((x) => x.id));
      const extraLocal = localFiltered.filter((x) => !remoteIdSet.has(x.id)).length;
      const total = typeof count === "number" ? count + extraLocal : merged.length;

      // Phân trang trên merged (đảm bảo local mới đăng vẫn nổi lên)
      const start = (page - 1) * pageSize;
      const pageItems = merged.slice(start, start + pageSize);
      const hasMore = start + pageItems.length < total;

      return { items: pageItems, total, page, pageSize, hasMore };
    } catch (err) {
      console.error("Get properties paged error:", err);
      // Fallback: chỉ local
      const all = sortNewest(filterClient(readLocal(), filters));
      const start = (page - 1) * pageSize;
      const pageItems = all.slice(start, start + pageSize);
      return {
        items: pageItems,
        total: all.length,
        page,
        pageSize,
        hasMore: start + pageItems.length < all.length,
      };
    }
  }

  /** Lấy chi tiết 1 tin (ưu tiên Supabase, fallback local) */
  static async getPropertyById(id: string): Promise<Property | null> {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        return {
          ...data,
          created_at: String((data as any).created_at ?? new Date().toISOString()),
          price: Number((data as any).price) || 0,
          area: Number((data as any).area) || 0,
          rent_per_month: Number((data as any).rent_per_month) || undefined,
          price_per_m2: Number((data as any).price_per_m2) || undefined,
          listingType: ((data as any).listing_type ?? (data as any).listingType) as
            | "sell"
            | "rent"
            | undefined,
          is_verified:
            typeof (data as any).is_verified === "boolean"
              ? (data as any).is_verified
              : (data as any).is_verified === 1,
          images: normalizeImages((data as any).images),
        };
      }

      // Fallback: tìm trong local
      const found = readLocal().find((x) => String(x.id) === String(id));
      return found ?? null;
    } catch (err) {
      console.error("Lỗi khi gọi getPropertyById:", err);
      const found = readLocal().find((x) => String(x.id) === String(id));
      return found ?? null;
    }
  }
}
