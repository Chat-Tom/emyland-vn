// src/features/listings/useListings.ts
import { useLocation } from "react-router-dom";
import { useMemo } from "react";
import { supabase } from "@/lib/supabase";

export type ListingFilters = {
  listingType?: "sell" | "rent";       // theo UI: Nhà đất bán / cho thuê
  propertyType?: string | null;        // ví dụ: 'nha_o_xa_hoi'...
  province?: string | null;            // cột province rút gọn để filter nhanh
  minArea?: number | null;
  maxArea?: number | null;

  // >>> Added: filter giá (theo listingType)
  minPrice?: number | null;            // bán: VND
  maxPrice?: number | null;
};

export async function fetchListings(page: number, pageSize = 12, f: ListingFilters = {}) {
  const start = (page - 1) * pageSize;
  const end   = start + pageSize - 1;

  // 1 truy vấn duy nhất: data + count
  let q = supabase
    .from("properties")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id",         { ascending: false });

  if (f.listingType)   q = q.eq("listing_type", f.listingType);
  if (f.propertyType)  q = q.eq("property_type", f.propertyType);
  if (f.province)      q = q.eq("province", f.province);
  if (f.minArea)       q = q.gte("area", f.minArea);
  if (f.maxArea)       q = q.lte("area", f.maxArea);

  // >>> Added: filter giá theo loại tin
  if (f.listingType === "sell") {
    if (typeof f.minPrice === "number") q = q.gte("price", f.minPrice);
    if (typeof f.maxPrice === "number") q = q.lte("price", f.maxPrice);
  } else if (f.listingType === "rent") {
    if (typeof f.minPrice === "number") q = q.gte("rent_per_month", f.minPrice);
    if (typeof f.maxPrice === "number") q = q.lte("rent_per_month", f.maxPrice);
  }

  const { data, count, error } = await q.range(start, end);
  if (error) throw error;

  return { items: data ?? [], total: count ?? 0 };
}

export function useUrlPage() {
  const { search } = useLocation();
  return useMemo(
    () => Math.max(1, Number(new URLSearchParams(search).get("page") || 1)),
    [search]
  );
}
