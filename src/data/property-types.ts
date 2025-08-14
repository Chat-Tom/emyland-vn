// src/data/property-types.ts

export type PropertyTypeValue =
  | "all"
  | "apartment"
  | "house"
  | "villa"
  | "office"
  | "other";

export type PropertyTypeOption = {
  value: PropertyTypeValue;
  label: string;
  hint?: string;
};

/**
 * Bộ loại nhà đất dùng chung cho SearchFilters (có "Tất cả")
 * và PostProperty (không dùng "Tất cả").
 * Thứ tự hiển thị theo yêu cầu UI.
 */
export const PROPERTY_TYPES: PropertyTypeOption[] = [
  { value: "all", label: "Tất cả" },
  { value: "apartment", label: "Căn hộ" },
  { value: "house", label: "Nhà đất riêng" },
  { value: "villa", label: "Biệt thự" },
  { value: "office", label: "Văn phòng" },
  {
    value: "other",
    label: "Nhà đất khác",
    hint: "Mặt bằng kinh doanh, khách sạn, nhà trọ, kho xưởng, đất nông nghiệp…",
  },
];

/** Options dùng cho form đăng tin (loại bỏ "Tất cả") */
export const PROPERTY_TYPES_FOR_FORM: PropertyTypeOption[] = PROPERTY_TYPES.filter(
  (t) => t.value !== "all"
);

/** Options cho bộ lọc tìm kiếm (mặc định có "Tất cả") */
export function buildPropertyOptionsForSearch(
  includeAll = true
): PropertyTypeOption[] {
  return includeAll ? PROPERTY_TYPES : PROPERTY_TYPES_FOR_FORM;
}

/** Options cho form đăng tin */
export function buildPropertyOptionsForForm(): PropertyTypeOption[] {
  return PROPERTY_TYPES_FOR_FORM;
}

/** Lấy label hiển thị từ value */
export function getPropertyLabel(value: string): string {
  return PROPERTY_TYPES.find((t) => t.value === value)?.label ?? value;
}
