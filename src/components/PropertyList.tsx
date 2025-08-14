import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import PropertyCard from "@/components/PropertyCard";
import { provinces as PROVINCES_ORG } from "@/data/vietnam-locations";
import { PropertyService, type Property as DBProperty } from "@/services/propertyService";

/* ===== Types ===== */
type ListingType = "sell" | "rent";

/* ===== helpers ===== */
function normProvinceName(p: any): string | null {
  if (!p) return null;
  if (typeof p === "string") return p.trim() || null;
  if (typeof p === "object") {
    const cand = p.name ?? p.label ?? p.title ?? p.province ?? p.value ?? p.text ?? null;
    if (typeof cand === "string") return cand.trim() || null;
  }
  return null;
}

export default function PropertyList() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const filtersFromState: any = location.state?.filters;
  const typeFromUrl = (searchParams.get("type") as ListingType) || undefined;

  // ====== State tìm kiếm (trung tâm) ======
  const [listingType, setListingType] = useState<ListingType>(
    (filtersFromState?.listingType as ListingType) || typeFromUrl || "sell"
  );
  const [province, setProvince] = useState<string>(filtersFromState?.province ?? "");
  const [type, setType] = useState<string>(filtersFromState?.type ?? "");
  const [minPrice, setMinPrice] = useState<number | undefined>(filtersFromState?.minPrice);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(filtersFromState?.maxPrice);
  const [minArea, setMinArea] = useState<number | undefined>(filtersFromState?.minArea);
  const [maxArea, setMaxArea] = useState<number | undefined>(filtersFromState?.maxArea);

  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<DBProperty[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Provinces: "Trên toàn quốc" đứng đầu, sau đó A→Z
  const provinceOptions = useMemo(() => {
    const names: string[] = [];
    for (const it of PROVINCES_ORG ?? []) {
      const n = normProvinceName(it);
      if (n) names.push(n);
    }
    const uniq = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, "vi"));
    return ["Trên toàn quốc", ...uniq];
  }, []);

  const isRent = listingType === "rent";
  const priceUnitLabel = isRent ? "Mức giá (triệu/tháng)" : "Mức giá (tỷ)";

  // ====== Fetch từ Supabase qua service ======
  const loadFromSupabase = async () => {
    setLoading(true);
    setError(null);
    try {
      const { items } = await PropertyService.getPropertiesPaged(
        {
          listingType,
          province: province || undefined,
          type: type || undefined,
          minPrice,
          maxPrice,
          minArea,
          maxArea,
        },
        { page: 1, pageSize: 24 }
      );
      setProperties(items);
    } catch (e: any) {
      setError(e?.message ?? "Đã có lỗi khi tải dữ liệu");
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // lần đầu + khi đổi tab bán/thuê
  useEffect(() => {
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setMinArea(undefined);
    setMaxArea(undefined);
    setType((prev) => prev || "");
    loadFromSupabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingType]);

  const onSearch = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    let a = minArea, b = maxArea;
    if (typeof a === "number" && typeof b === "number" && a > b) [a, b] = [b, a];
    let pmin = minPrice, pmax = maxPrice;
    if (typeof pmin === "number" && typeof pmax === "number" && pmin > pmax) [pmin, pmax] = [pmax, pmin];
    setMinArea(a); setMaxArea(b); setMinPrice(pmin); setMaxPrice(pmax);
    await loadFromSupabase();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ====== UI ======
  return (
    <div className="min-h-screen bg-gray-50">
      {/* HERO search center */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500">
        <div className="container mx-auto px-4 py-6 sm:py-10">
          {/* Tabs */}
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setListingType("sell")}
              className={`px-4 py-2 rounded-lg font-semibold ${
                listingType === "sell" ? "bg-white text-black" : "bg-white/20 text-white"
              }`}
            >
              Nhà đất bán
            </button>
            <button
              onClick={() => setListingType("rent")}
              className={`px-4 py-2 rounded-lg font-semibold ${
                listingType === "rent" ? "bg-white text-black" : "bg-white/20 text-white"
              }`}
            >
              Nhà đất cho thuê
            </button>
          </div>

          {/* Search bar */}
          <form onSubmit={onSearch} className="bg-white rounded-xl shadow-xl p-3 sm:p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Khu vực */}
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Khu vực</label>
              <select
                className="w-full h-11 rounded-md border px-3"
                value={province || ""}
                onChange={(e) => setProvince(e.target.value || "")}
              >
                {provinceOptions.map((p) => (
                  <option key={p} value={p === "Trên toàn quốc" ? "" : p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Loại BĐS */}
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Loại nhà đất</label>
              <select className="w-full h-11 rounded-md border px-3" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Tất cả loại</option>
                <option value="apartment">Căn hộ</option>
                <option value="house">Nhà phố</option>
                <option value="land">Đất</option>
                <option value="villa">Biệt thự</option>
                <option value="office">Văn phòng</option>
              </select>
            </div>

            {/* Giá */}
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">{priceUnitLabel}</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  className="h-11 rounded-md border px-3"
                  placeholder={isRent ? "Tối thiểu (triệu)" : "Tối thiểu (tỷ)"}
                  value={
                    !minPrice || minPrice <= 0
                      ? ""
                      : isRent
                      ? Math.round(minPrice / 1_000_000)
                      : Number((minPrice / 1_000_000_000).toFixed(2))
                  }
                  onChange={(e) => {
                    const v = e.currentTarget.value;
                    if (v === "") return setMinPrice(undefined);
                    const n = Number(v);
                    setMinPrice(isRent ? n * 1_000_000 : n * 1_000_000_000);
                  }}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  className="h-11 rounded-md border px-3"
                  placeholder={isRent ? "Tối đa (triệu)" : "Tối đa (tỷ)"}
                  value={
                    !maxPrice || maxPrice <= 0
                      ? ""
                      : isRent
                      ? Math.round(maxPrice / 1_000_000)
                      : Number((maxPrice / 1_000_000_000).toFixed(2))
                  }
                  onChange={(e) => {
                    const v = e.currentTarget.value;
                    if (v === "") return setMaxPrice(undefined);
                    const n = Number(v);
                    setMaxPrice(isRent ? n * 1_000_000 : n * 1_000_000_000);
                  }}
                />
              </div>
            </div>

            {/* Diện tích */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Diện tích (m²)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  className="h-11 rounded-md border px-3"
                  placeholder="Tối thiểu"
                  value={minArea ?? ""}
                  onChange={(e) => setMinArea(e.currentTarget.value === "" ? undefined : e.currentTarget.valueAsNumber)}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  className="h-11 rounded-md border px-3"
                  placeholder="Tối đa"
                  value={maxArea ?? ""}
                  onChange={(e) => setMaxArea(e.currentTarget.value === "" ? undefined : e.currentTarget.valueAsNumber)}
                />
              </div>
            </div>

            {/* CTA */}
            <div className="md:col-span-12 flex justify-end">
              <button type="submit" className="h-11 px-6 rounded-lg font-semibold bg-red-500 hover:bg-red-600 text-white shadow">
                Tìm kiếm
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* RESULTS */}
      <div className="container mx-auto px-4 py-6">
        {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center text-gray-600 py-20">Không tìm thấy bất động sản phù hợp.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p as any} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
