// src/data/property-types.ts

/** Loại tin đăng */
export type ListingType = "sell" | "rent";

/** Mã loại BĐS chuẩn trong hệ thống */
export type PropertyTypeCode =
  | "apartment"   // Căn hộ chung cư
  | "studio"      // Căn hộ studio/1PN nhỏ
  | "condotel"    // Căn hộ dịch vụ/condotel
  | "house"       // Nhà riêng/nhà phố liền kề
  | "townhouse"   // Nhà phố mặt tiền/nhà liền kề
  | "shophouse"   // Shophouse
  | "villa"       // Biệt thự
  | "land"        // Đất
  | "office"      // Văn phòng
  | "warehouse"   // Kho/xưởng
  | "farm";       // Trang trại/nhà vườn

export interface PropertyTypeOption {
  value: PropertyTypeCode | "all";
  label: string;
  group?: string; // Nhóm hiển thị (nếu cần)
}

/** Danh sách loại BĐS dùng cho bộ lọc/chọn */
export const PROPERTY_TYPES: PropertyTypeOption[] = [
  { value: "all",       label: "Tất cả" },

  // Căn hộ
  { value: "apartment", label: "Căn hộ chung cư", group: "Căn hộ" },
  { value: "studio",    label: "Studio/1PN nhỏ",  group: "Căn hộ" },
  { value: "condotel",  label: "Condotel/Dịch vụ",group: "Căn hộ" },

  // Nhà
  { value: "house",     label: "Nhà riêng",       group: "Nhà" },
  { value: "townhouse", label: "Nhà phố",         group: "Nhà" },
  { value: "shophouse", label: "Shophouse",       group: "Nhà" },
  { value: "villa",     label: "Biệt thự",        group: "Nhà" },

  // Khác
  { value: "land",      label: "Đất" },
  { value: "office",    label: "Văn phòng" },
  { value: "warehouse", label: "Kho/xưởng" },
  { value: "farm",      label: "Trang trại/nhà vườn" },
];

/** Map nhanh code -> label (tiện render chi tiết) */
export const TYPE_LABELS: Record<PropertyTypeCode, string> = {
  apartment: "Căn hộ chung cư",
  studio: "Studio/1PN nhỏ",
  condotel: "Condotel/Dịch vụ",
  house: "Nhà riêng",
  townhouse: "Nhà phố",
  shophouse: "Shophouse",
  villa: "Biệt thự",
  land: "Đất",
  office: "Văn phòng",
  warehouse: "Kho/xưởng",
  farm: "Trang trại/nhà vườn",
};

/** Tuỳ chọn loại tin đăng */
export const LISTING_TYPE_OPTIONS: Array<{ value: ListingType; label: string }> = [
  { value: "sell", label: "Nhà đất bán" },
  { value: "rent", label: "Nhà đất cho thuê" },
];

/* ------------------------- Price helpers ------------------------- */
export const billion = (n: number) => Math.round(n * 1_000_000_000);
export const million = (n: number) => Math.round(n * 1_000_000);

/** Khoảng giá cho BÁN (đơn vị hiển thị: tỷ; giá trị: VND) */
export const PRICE_BRACKETS_SELL: Array<{ label: string; min?: number; max?: number }> = [
  { label: "Thỏa thuận" }, // không lọc
  { label: "≤ 1 tỷ",        max: billion(1) },
  { label: "1 – 2 tỷ",      min: billion(1),  max: billion(2) },
  { label: "2 – 3 tỷ",      min: billion(2),  max: billion(3) },
  { label: "3 – 5 tỷ",      min: billion(3),  max: billion(5) },
  { label: "5 – 7 tỷ",      min: billion(5),  max: billion(7) },
  { label: "7 – 10 tỷ",     min: billion(7),  max: billion(10) },
  { label: "10 – 20 tỷ",    min: billion(10), max: billion(20) },
  { label: "≥ 20 tỷ",       min: billion(20) },
];

/** Khoảng giá cho THUÊ (đơn vị hiển thị: triệu/tháng; giá trị: VND) */
export const PRICE_BRACKETS_RENT: Array<{ label: string; min?: number; max?: number }> = [
  { label: "Thỏa thuận" }, // không lọc
  { label: "≤ 5 triệu/tháng",       max: million(5) },
  { label: "5 – 10 triệu/tháng",    min: million(5),  max: million(10) },
  { label: "10 – 15 triệu/tháng",   min: million(10), max: million(15) },
  { label: "15 – 20 triệu/tháng",   min: million(15), max: million(20) },
  { label: "20 – 30 triệu/tháng",   min: million(20), max: million(30) },
  { label: "≥ 30 triệu/tháng",      min: million(30) },
];

/** Khoảng diện tích m² (value là m²) */
export const AREA_BRACKETS: Array<{ label: string; min?: number; max?: number }> = [
  { label: "Tất cả" },
  { label: "≤ 30 m²",      max: 30 },
  { label: "30 – 50 m²",   min: 30,  max: 50 },
  { label: "50 – 80 m²",   min: 50,  max: 80 },
  { label: "80 – 120 m²",  min: 80,  max: 120 },
  { label: "120 – 200 m²", min: 120, max: 200 },
  { label: "≥ 200 m²",     min: 200 },
];

/* ------------------------- Utilities ------------------------- */

/** Map text tự do từ form cũ sang code chuẩn trong hệ thống */
export function mapPropertyTypeToCode(label?: string): PropertyTypeCode | undefined {
  const s = (label ?? "").toLowerCase();
  if (!s) return undefined;
  if (s.includes("căn hộ") || s.includes("chung cư")) return "apartment";
  if (s.includes("studio")) return "studio";
  if (s.includes("condotel") || s.includes("dịch vụ")) return "condotel";
  if (s.includes("biệt thự")) return "villa";
  if (s.includes("shophouse")) return "shophouse";
  if (s.includes("nhà phố")) return "townhouse";
  if (s.includes("nhà riêng") || s.includes("nhà đất") || s.includes("nhà liền kề")) return "house";
  if (s.includes("văn phòng") || s.includes("office")) return "office";
  if (s.includes("kho") || s.includes("xưởng")) return "warehouse";
  if (s.includes("trang trại") || s.includes("nhà vườn") || s.includes("farm")) return "farm";
  if (s.includes("đất") || s.includes("thổ cư")) return "land";
  return undefined;
}

/** Trả về khoảng giá tương ứng một giá trị (theo loại tin) để hiển thị nhanh */
export function findPriceBracket(
  listingType: ListingType,
  priceVnd?: number
): { label: string; min?: number; max?: number } | undefined {
  if (!priceVnd || priceVnd <= 0) return undefined;
  const list = listingType === "rent" ? PRICE_BRACKETS_RENT : PRICE_BRACKETS_SELL;
  return list.find((r) => {
    const okMin = typeof r.min === "number" ? priceVnd >= r.min : true;
    const okMax = typeof r.max === "number" ? priceVnd <= r.max : true;
    return okMin && okMax;
  });
}
