// src/pages/Home.tsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import { provinces as PROVINCES_ORG } from "@/data/vietnam-locations";
import { PropertyService, type Property as DBProperty } from "@/services/propertyService";
import "@/index.css";

type ListingType = "sell" | "rent";

/* ===== Helpers ===== */
const TOP_CITIES = ["Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Huế"];
const viSort = (a: string, b: string) => a.localeCompare(b, "vi");
const normalizeProvince = (raw?: string): string => {
  const s = (raw ?? "").trim();
  if (/^Tỉnh\s*\/\s*Thành\s*Phố$/i.test(s)) return "";
  return s.replace(/^\s*Thành\s*phố\s+/i, "").replace(/^\s*Tỉnh\s+/i, "").trim();
};
const toDisplay = (isRent: boolean, v?: number) =>
  !v && v !== 0 ? "" : isRent ? Math.round((v ?? 0) / 1_000_000) : Math.round((v ?? 0) / 1_000_000_000);
const fromDisplay = (isRent: boolean, n: number) => (isRent ? n * 1_000_000 : n * 1_000_000_000);

/** Chuẩn hoá 1 record DB về shape PropertyCard cần */
function normalizeForCard(p: any) {
  const id = String(p.id ?? p._id ?? (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`));
  const title = p.title ?? p.name ?? p.headline ?? "Tin đăng bất động sản";

  // Loại bài: cố gắng suy ra nếu thiếu
  const listingType: ListingType =
    (p.listingType as ListingType) ??
    (p.for_rent ? "rent" : undefined) ??
    (p.for_sale ? "sell" : undefined) ??
    (p.rent_per_month ? "rent" : "sell");

  // Giá bán/thuê
  const price: number | undefined =
    p.price ?? p.sale_price ?? p.asking_price ?? (listingType === "sell" ? p.total_price : undefined);

  const rent_per_month: number | undefined =
    p.rent_per_month ?? p.monthly_rent ?? p.rent ?? (listingType === "rent" ? p.price : undefined);

  // Diện tích
  const area: number = Number(p.area ?? p.acreage ?? p.squareMeters ?? p.sqm ?? p.size) || 0;

  // Giá/m² (tự tính nếu thiếu khi BÁN)
  const price_per_m2: number | undefined =
    p.price_per_m2 ?? (listingType === "sell" && area > 0 && price ? Math.round(price / area) : undefined);

  // Địa chỉ
  const ward = p.ward ?? p.wardName ?? p.commune ?? p.subdistrict ?? "";
  const province = p.province ?? p.provinceName ?? p.city ?? p.region ?? "";
  const location =
    p.location ??
    p.address ??
    [p.street, p.district || p.districtName, ward, province].filter(Boolean).join(", ");

  // Ảnh
  const images =
    p.images ?? p.imageUrls ?? p.photos ?? p.gallery ?? (p.media && (p.media.urls || p.media)) ?? p.cover;

  // Kiểu BĐS
  const type: string | undefined = p.type ?? p.category ?? p.propertyType ?? p.kind ?? undefined;

  // Xác minh
  const verificationStatus =
    p.verificationStatus ?? (p.is_verified ? "verified" : undefined) ?? (p.verified ? "verified" : undefined);

  const is_verified: boolean | undefined = p.is_verified ?? p.verified ?? (verificationStatus === "verified");

  // Phòng ngủ/tắm
  const bedrooms: number | undefined = p.bedrooms ?? p.bedroom_count ?? p.bed ?? undefined;
  const bathrooms: number | undefined = p.bathrooms ?? p.bathroom_count ?? p.bath ?? undefined;

  // HOT / rating
  const isHot: boolean | undefined = p.isHot ?? p.hot ?? undefined;
  const rating: number | undefined = Number(p.rating ?? 4.8);

  return {
    id,
    title,
    price,
    rent_per_month,
    price_per_m2,
    location,
    ward,
    province,
    area,
    bedrooms,
    bathrooms,
    images,
    type,
    verificationStatus,
    is_verified,
    rating,
    listingType,
    isHot,
  };
}

export default function Home() {
  // Search state
  const [listingType, setListingType] = useState<ListingType>("sell");
  const [province, setProvince] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [minArea, setMinArea] = useState<number | undefined>(undefined);
  const [maxArea, setMaxArea] = useState<number | undefined>(undefined);

  // Paging & totals
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(24);
  const [total, setTotal] = useState<number>(0);
  const [totalAll, setTotalAll] = useState<number>(0);

  // Data
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<DBProperty[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fallback “tin mới nhất”
  const [latest, setLatest] = useState<DBProperty[]>([]);
  const [latestLoading, setLatestLoading] = useState(false);

  // Province options
  const provinceOptions = useMemo(() => {
    if (!Array.isArray(PROVINCES_ORG)) return ["Trên toàn quốc"];
    const normalized = PROVINCES_ORG.map((p: any) => normalizeProvince(p?.provinceName)).filter(Boolean) as string[];
    const uniq = Array.from(new Set(normalized)).sort(viSort);
    const priority = TOP_CITIES.filter((c) => uniq.includes(c));
    const rest = uniq.filter((n) => !priority.includes(n));
    return ["Trên toàn quốc", ...priority, ...rest];
  }, []);

  const isRent = listingType === "rent";
  const priceUnitShort = isRent ? "triệu/tháng" : "tỷ";
  const priceUnitLabel = isRent ? "Mức giá (triệu/tháng)" : "Mức giá (tỷ)";

  // Presets
  const pricePresets = useMemo(
    () =>
      isRent
        ? [
            { label: "Tất cả mức giá", min: undefined, max: undefined },
            { label: "Dưới 5 triệu", min: undefined, max: 5 },
            { label: "5 - 10 triệu", min: 5, max: 10 },
            { label: "10 - 20 triệu", min: 10, max: 20 },
            { label: "20 - 40 triệu", min: 20, max: 40 },
            { label: "Trên 40 triệu", min: 40, max: undefined },
            { label: "Thỏa thuận", min: 0, max: 0 },
          ]
        : [
            { label: "Tất cả mức giá", min: undefined, max: undefined },
            { label: "Dưới 1 tỷ", min: undefined, max: 1 },
            { label: "1 - 2 tỷ", min: 1, max: 2 },
            { label: "2 - 3 tỷ", min: 2, max: 3 },
            { label: "3 - 5 tỷ", min: 3, max: 5 },
            { label: "5 - 10 tỷ", min: 5, max: 10 },
            { label: "10 - 20 tỷ", min: 10, max: 20 },
            { label: "20 - 40 tỷ", min: 20, max: 40 },
            { label: "Trên 40 tỷ", min: 40, max: undefined },
            { label: "Thỏa thuận", min: 0, max: 0 },
          ],
    [isRent]
  );

  const areaPresets = [
    { label: "Tất cả diện tích", min: undefined, max: undefined },
    { label: "Dưới 30 m²", min: undefined, max: 30 },
    { label: "30 - 50 m²", min: 30, max: 50 },
    { label: "50 - 80 m²", min: 50, max: 80 },
    { label: "80 - 100 m²", min: 80, max: 100 },
    { label: "100 - 150 m²", min: 100, max: 150 },
    { label: "150 - 300 m²", min: 150, max: 300 },
    { label: "300 - 500 m²", min: 300, max: 500 },
    { label: "Trên 500 m²", min: 500, max: undefined },
  ];

  // Debounce apply khi auto-áp dụng từ popover
  const applyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleApply = (overrides?: Partial<{
    minPrice: number | undefined; maxPrice: number | undefined;
    minArea: number | undefined; maxArea: number | undefined;
    province: string; type: string;
  }>) => {
    if (applyTimer.current) clearTimeout(applyTimer.current);
    applyTimer.current = setTimeout(() => {
      applySearchNow(overrides);
    }, 350);
  };

  // Load theo bộ lọc & trang
  const loadFromSupabase = useCallback(async (nextPage = page, overrides?: Partial<{
    minPrice: number | undefined; maxPrice: number | undefined;
    minArea: number | undefined; maxArea: number | undefined;
    province: string; type: string;
  }>) => {
    setLoading(true);
    setError(null);
    try {
      const { items, total: t } = await PropertyService.getPropertiesPaged(
        {
          listingType,
          province: ((overrides?.province ?? province) || undefined),
          type: ((overrides?.type ?? type) || undefined),
          minPrice: overrides?.minPrice ?? minPrice,
          maxPrice: overrides?.maxPrice ?? maxPrice,
          minArea: overrides?.minArea ?? minArea,
          maxArea: overrides?.maxArea ?? maxArea,
        },
        { page: nextPage, pageSize }
      );
      setProperties(items);
      setTotal(t);
    } catch (e: any) {
      setError(e?.message ?? "Đã có lỗi khi tải dữ liệu");
      setProperties([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingType, province, type, minPrice, maxPrice, minArea, maxArea, page, pageSize]);

  // Tổng toàn quốc
  const loadTotals = useCallback(async () => {
    try {
      const { total: all } = await PropertyService.getPropertiesPaged(undefined, { page: 1, pageSize: 1 });
      setTotalAll(all);
    } catch {
      setTotalAll(0);
    }
  }, []);

  // Fallback latest
  const loadLatest = useCallback(async () => {
    setLatest([]);
    setLatestLoading(true);
    try {
      const { items } = await PropertyService.getPropertiesPaged(undefined, { page: 1, pageSize: 12 });
      setLatest(items);
    } finally {
      setLatestLoading(false);
    }
  }, []);

  // Khi đổi tab
  useEffect(() => {
    setPage(1);
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setMinArea(undefined);
    setMaxArea(undefined);
    loadFromSupabase(1);
    loadTotals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingType]);

  // Lần đầu -> tổng toàn quốc
  useEffect(() => {
    loadTotals();
  }, [loadTotals]);

  // Nếu tìm không ra, tự load “tin mới nhất”
  useEffect(() => {
    if (!loading && properties.length === 0) loadLatest();
  }, [loading, properties.length, loadLatest]);

  // TỰ CẬP NHẬT KHI LOCALSTORAGE THAY ĐỔI (đăng tin ở trang khác)
  useEffect(() => {
    const refreshAll = () => {
      // tải lại theo bộ lọc hiện tại và cập nhật “tin mới nhất”
      loadFromSupabase(1);
      loadTotals();
      loadLatest();
    };
    // sự kiện custom (trong cùng tab)
    const onCustom = () => refreshAll();
    // sự kiện storage (khác tab)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "emyland_properties_updated") refreshAll();
    };

    window.addEventListener("emyland:properties-changed", onCustom as EventListener);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("emyland:properties-changed", onCustom as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [loadFromSupabase, loadLatest, loadTotals]);

  const goPage = (p: number) => {
    const np = Math.max(1, p);
    setPage(np);
    loadFromSupabase(np);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // chuẩn hoá + tìm kiếm (áp dụng ngay giá trị hiện tại hoặc overrides)
  const applySearchNow = async (overrides?: Partial<{
    minPrice: number | undefined; maxPrice: number | undefined;
    minArea: number | undefined; maxArea: number | undefined;
    province: string; type: string;
  }>) => {
    let a = overrides?.minArea ?? minArea;
    let b = overrides?.maxArea ?? maxArea;
    if (typeof a === "number" && typeof b === "number" && a > b) [a, b] = [b, a];

    let pmin = overrides?.minPrice ?? minPrice;
    let pmax = overrides?.maxPrice ?? maxPrice;
    if (typeof pmin === "number" && typeof pmax === "number" && pmin > pmax) [pmin, pmax] = [pmax, pmin];

    // cập nhật state trước
    if (overrides?.minArea !== undefined) setMinArea(a);
    if (overrides?.maxArea !== undefined) setMaxArea(b);
    if (overrides?.minPrice !== undefined) setMinPrice(pmin);
    if (overrides?.maxPrice !== undefined) setMaxPrice(pmax);
    if (overrides?.province !== undefined) setProvince(overrides.province);
    if (overrides?.type !== undefined) setType(overrides.type);

    setPage(1);
    await loadFromSupabase(1, { minArea: a, maxArea: b, minPrice: pmin, maxPrice: pmax, province: overrides?.province, type: overrides?.type });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSearch = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    await applySearchNow();
  };

  /* ===== Popovers + click-outside ===== */
  const [showPrice, setShowPrice] = useState(false);
  const [showArea, setShowArea] = useState(false);
  const priceRef = useRef<HTMLDivElement | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const n = e.target as Node;
      if (priceRef.current && !priceRef.current.contains(n)) setShowPrice(false);
      if (areaRef.current && !areaRef.current.contains(n)) setShowArea(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  /* ===== Summaries & slider config ===== */
  const priceSummary = useMemo(() => {
    const minD = toDisplay(isRent, minPrice);
    const maxD = toDisplay(isRent, maxPrice);
    if ((minPrice === 0 && maxPrice === 0) || (minD === 0 && maxD === 0)) return "Thỏa thuận";
    if (!minD && !maxD) return "Mức giá";
    if (minD && !maxD) return `Từ ${minD} ${priceUnitShort}`;
    if (!minD && maxD) return `Đến ${maxD} ${priceUnitShort}`;
    return `${minD}–${maxD} ${priceUnitShort}`;
  }, [isRent, minPrice, maxPrice, priceUnitShort]);

  const areaSummary = useMemo(() => {
    if (!minArea && !maxArea) return "Diện tích";
    if (minArea && !maxArea) return `Từ ${minArea} m²`;
    if (!minArea && maxArea) return `Đến ${maxArea} m²`;
    return `${minArea}–${maxArea} m²`;
  }, [minArea, maxArea]);

  const priceMaxDisplay = isRent ? 100 : 1000; // triệu/tháng | tỷ
  const priceStep = 1;
  const areaMax = 10000;
  const areaStep = 50;

  const marks = [0, 25, 50, 75, 100];

  /* ===== Chips cho Header ===== */
  const typeTextMap: Record<string, string> = {
    apartment: "Căn hộ",
    house: "Nhà đất riêng",
    villa: "Biệt thự",
    office: "Văn phòng",
    land: "Nhà đất khác",
  };
  const selectedChips = useMemo(() => {
    const chips: string[] = [];
    chips.push(listingType === "sell" ? "Bán" : "Thuê");
    if (province) chips.push(province);
    if (type && typeTextMap[type]) chips.push(typeTextMap[type]);
    if (priceSummary !== "Mức giá") chips.push(priceSummary);
    if (areaSummary !== "Diện tích") chips.push(areaSummary);
    return chips;
  }, [listingType, province, type, priceSummary, areaSummary]);

  // Handlers auto-apply cho popovers
  const handlePriceChange = (minUnit?: number, maxUnit?: number) => {
    const commitMin = minUnit === undefined ? undefined : fromDisplay(isRent, minUnit);
    const commitMax = maxUnit === undefined ? undefined : fromDisplay(isRent, maxUnit);
    setMinPrice(commitMin);
    setMaxPrice(commitMax);
    scheduleApply({ minPrice: commitMin, maxPrice: commitMax });
  };
  const handleAreaChange = (min?: number, max?: number) => {
    setMinArea(min);
    setMaxArea(max);
    scheduleApply({ minArea: min, maxArea: max });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header: truyền filters để hiển thị tag */}
      {/* @ts-ignore in case Header props aren't typed yet */}
      <Header
        filters={{
          listingType,
          province,
          type,
          minPrice,
          maxPrice,
          minArea,
          maxArea,
          priceSummary,
          areaSummary,
          selectedChips,
        }}
      />

      {/* HERO: nền gradient + thanh tìm kiếm */}
      <section className="bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500">
        <div className="container mx-auto px-4 py-6 sm:py-10">
          {/* Tabs Bán/Thuê */}
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setListingType("sell")}
              className={`px-4 py-2 rounded-lg font-semibold ${listingType === "sell" ? "bg-white text-black" : "bg-white/20 text-white"}`}
            >
              Nhà đất bán
            </button>
            <button
              onClick={() => setListingType("rent")}
              className={`px-4 py-2 rounded-lg font-semibold ${listingType === "rent" ? "bg-white text-black" : "bg-white/20 text-white"}`}
            >
              Nhà đất cho thuê
            </button>
          </div>

          {/* Thanh tìm kiếm */}
          <form onSubmit={onSearch} className="bg-white rounded-xl shadow-xl p-3 sm:p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
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

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Loại nhà đất</label>
              <select
                className="w-full h-11 rounded-md border px-3"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="">Tất cả</option>
                <option value="apartment" title="Căn hộ chung cư, officetel, studio…">Căn hộ</option>
                <option value="house" title="Nhà riêng, nhà phố, liền kề">Nhà đất riêng</option>
                <option value="villa" title="Biệt thự đơn lập, song lập, villa nghỉ dưỡng">Biệt thự</option>
                <option value="office" title="Văn phòng, shophouse office, co-working">Văn phòng</option>
                <option value="land" title="Mặt bằng kinh doanh, khách sạn, nhà trọ, kho xưởng, đất nông nghiệp…">Nhà đất khác</option>
              </select>
            </div>

            {/* Nút 'Mức giá' (auto-apply, không có nút Áp dụng/Đặt lại) */}
            <PricePopover
              label={priceUnitLabel}
              summary={priceSummary}
              show={showPrice}
              setShow={setShowPrice}
              isRent={isRent}
              minPrice={minPrice}
              maxPrice={maxPrice}
              pricePresets={pricePresets}
              priceMaxDisplay={priceMaxDisplay}
              priceStep={priceStep}
              marks={marks}
              priceUnitShort={priceUnitShort}
              priceRefEl={priceRef}
              onChangeUnits={handlePriceChange}
            />

            {/* Nút 'Diện tích' (auto-apply, không có nút Áp dụng/Đặt lại) */}
            <AreaPopover
              summary={areaSummary}
              show={showArea}
              setShow={setShowArea}
              minArea={minArea}
              maxArea={maxArea}
              areaPresets={areaPresets}
              areaMax={areaMax}
              areaStep={areaStep}
              marks={marks}
              areaRefEl={areaRef}
              onChange={handleAreaChange}
            />

            <div className="md:col-span-12 flex justify-end">
              <button type="submit" className="h-11 px-6 rounded-lg font-semibold bg-red-500 hover:bg-red-600 text-white shadow">
                Tìm kiếm
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Styles slider */}
      <style>{`
        .range-2 .track-base{background:linear-gradient(90deg,#93c5fd,#d8b4fe,#fdba74);opacity:.65;}
        .range-2 .track-fill{background:linear-gradient(90deg,#fbbf24,#ef4444);}
        .range-2 input[type="range"]{-webkit-appearance:none;appearance:none;height:0;position:absolute;left:0;right:0;pointer-events:all;}
        .range-2 input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:20px;height:20px;border-radius:9999px;background:#111;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.25),0 0 0 3px rgba(0,0,0,.1);cursor:pointer;}
        .range-2 input[type="range"]::-moz-range-thumb{width:20px;height:20px;border-radius:9999px;background:#111;border:3px solid #fff;cursor:pointer;box-shadow:0 1px 6px rgba(0,0,0,.25),0 0 0 3px rgba(0,0,0,.1);}
        .range-2 input.slider-min::-webkit-slider-thumb{background:#fbbf24;}
        .range-2 input.slider-min::-moz-range-thumb{background:#fbbf24;}
        .range-2 input.slider-max::-webkit-slider-thumb{background:#ef4444;}
        .range-2 input.slider-max::-moz-range-thumb{background:#ef4444;}
        .range-2 .mark{width:6px;height:6px;border-radius:9999px;background:#9ca3af;transform:translateX(-50%);top:22px;position:absolute;}
        .range-2 .mark-label{position:absolute;top:30px;transform:translateX(-50%);font-size:11px;color:#6b7280;}
      `}</style>

      {/* COUNTER BAR */}
      <div className="container mx-auto px-4">
        <div className="mt-4 mb-2 rounded-lg border bg-white px-4 py-3 text-sm text-gray-700 flex items-center justify-between">
          <div>
            <span className="font-semibold text-gray-900">{total.toLocaleString("vi-VN")}</span> tin phù hợp
            <span className="mx-2 text-gray-400">•</span>
            Toàn quốc <span className="font-semibold text-gray-900">{totalAll.toLocaleString("vi-VN")}</span> tin
          </div>
          <button
            className="hidden sm:inline-flex text-xs px-3 py-1 rounded border hover:bg-gray-50"
            onClick={() => {
              setProvince(""); setType("");
              setMinPrice(undefined); setMaxPrice(undefined);
              setMinArea(undefined); setMaxArea(undefined);
              setPage(1);
              loadFromSupabase(1, { province: "", type: "", minPrice: undefined, maxPrice: undefined, minArea: undefined, maxArea: undefined });
            }}
          >
            Xóa lọc & xem tất cả
          </button>
        </div>
      </div>

      {/* RESULTS */}
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 pb-10">
          {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-72 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : properties.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((p: any) => (
                  <PropertyCard key={String(p.id ?? p._id)} property={normalizeForCard(p)} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button className="px-3 py-2 rounded border bg-white disabled:opacity-50" onClick={() => goPage(page - 1)} disabled={page <= 1}>
                    ‹ Trước
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => i + 1).slice(Math.max(0, page - 4), page + 3).map((p) => (
                    <button key={p} className={`px-3 py-2 rounded border ${page === p ? "bg-black text-white" : "bg-white"}`} onClick={() => goPage(p)}>
                      {p}
                    </button>
                  ))}
                  <button className="px-3 py-2 rounded border bg-white disabled:opacity-50" onClick={() => goPage(page + 1)} disabled={page >= totalPages}>
                    Sau ›
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Fallback feed: Tin đăng mới nhất */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Tin đăng mới nhất</h3>
              </div>

              {latestLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-72 rounded-xl bg-gray-100 animate-pulse" />)}
                </div>
              ) : latest.length === 0 ? (
                <div className="text-center text-gray-600 py-16">Hiện chưa có tin nào.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {latest.map((p: any) => (
                    <PropertyCard key={String(p.id ?? p._id)} property={normalizeForCard(p)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* ===== Popover Giá — auto-apply ===== */
function PricePopover({
  label, summary, show, setShow, isRent,
  minPrice, maxPrice,
  pricePresets, priceMaxDisplay, priceStep, marks, priceUnitShort, priceRefEl,
  onChangeUnits, // (minInUnit?, maxInUnit?) => void
}: any) {
  const toD = (isRent: boolean, v?: number) => (!v && v !== 0 ? "" : isRent ? Math.round((v ?? 0) / 1_000_000) : Math.round((v ?? 0) / 1_000_000_000));

  // hiển thị luôn theo state global (đã lưu), auto-apply ngay khi đổi
  const minD = (toD(isRent, minPrice) as number | "") || 0;
  const maxD = (toD(isRent, maxPrice) as number | "") || priceMaxDisplay;

  const changeMin = (val: number | undefined) => {
    const newMin = val;
    const newMax = typeof maxD === "number" ? maxD : undefined;
    onChangeUnits?.(newMin, newMax);
  };
  const changeMax = (val: number | undefined) => {
    const newMin = typeof minD === "number" ? minD : undefined;
    const newMax = val;
    onChangeUnits?.(newMin, newMax);
  };

  return (
    <div className="md:col-span-3 relative" ref={priceRefEl}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <button type="button" onClick={() => setShow((v: boolean) => !v)} className="w-full h-11 rounded-md border px-3 text-left hover:bg-gray-50">
        {summary}
      </button>

      {show && (
        <div className="absolute z-50 mt-2 w-[520px] max-w-[95vw] rounded-xl border bg-white shadow-xl p-4 right-0">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Mức giá</div>
            <button className="text-xl leading-none" type="button" onClick={() => setShow(false)}>×</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-600 mb-1">Giá thấp nhất</div>
              <input
                type="number" inputMode="numeric" placeholder="Từ"
                className="w-full h-10 rounded-md border px-3"
                value={typeof minD === "number" ? minD : ""}
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  changeMin(v === "" ? undefined : Number(v));
                }}
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Giá cao nhất</div>
              <input
                type="number" inputMode="numeric" placeholder="Đến"
                className="w-full h-10 rounded-md border px-3"
                value={typeof maxD === "number" ? maxD : ""}
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  changeMax(v === "" ? undefined : Number(v));
                }}
              />
            </div>
          </div>

          <div className="text-xs text-gray-500 mt-2">
            {isRent ? "Kéo để chọn nhanh (0 – 100 triệu/tháng). Giá cao hơn hãy nhập trực tiếp."
                    : "Kéo để chọn nhanh (0 – 1000 tỷ). Giá cao hơn hãy nhập trực tiếp."}
          </div>

          <DualSlider
            min={0}
            max={priceMaxDisplay}
            step={priceStep}
            leftValue={typeof minD === "number" ? minD : 0}
            rightValue={typeof maxD === "number" ? maxD : priceMaxDisplay}
            onLeft={(v: number) => {
              const right = typeof maxD === "number" ? maxD : priceMaxDisplay;
              const next = Math.min(v, right);
              changeMin(next);
            }}
            onRight={(v: number) => {
              const left = typeof minD === "number" ? minD : 0;
              const next = Math.max(v, left);
              changeMax(next);
            }}
            marks={marks}
            rightLabel={`${priceMaxDisplay} ${priceUnitShort}`}
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            {pricePresets.map((p: any, i: number) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (p.min === 0 && p.max === 0) onChangeUnits?.(0, 0);
                  else onChangeUnits?.(p.min, p.max);
                }}
                className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 text-left"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Popover Diện tích — auto-apply ===== */
function AreaPopover({
  summary, show, setShow, minArea, maxArea,
  areaPresets, areaMax, areaStep, marks, areaRefEl, onChange
}: any) {
  const minD = typeof minArea === "number" ? minArea : 0;
  const maxD = typeof maxArea === "number" ? maxArea : areaMax;

  return (
    <div className="md:col-span-2 relative" ref={areaRefEl}>
      <label className="block text-xs font-medium text-gray-600 mb-1">Diện tích (m²)</label>
      <button type="button" onClick={() => setShow((v: boolean) => !v)} className="w-full h-11 rounded-md border px-3 text-left hover:bg-gray-50">
        {summary}
      </button>

      {show && (
        <div className="absolute z-50 mt-2 w-[520px] max-w-[95vw] rounded-xl border bg-white shadow-xl p-4 right-0">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Diện tích</div>
            <button className="text-xl leading-none" type="button" onClick={() => setShow(false)}>×</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-600 mb-1">Từ</div>
              <input
                type="number" inputMode="numeric" placeholder="0"
                className="w-full h-10 rounded-md border px-3"
                value={typeof minArea === "number" ? minArea : ""}
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  onChange?.(v === "" ? undefined : e.currentTarget.valueAsNumber, maxArea);
                }}
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Đến</div>
              <input
                type="number" inputMode="numeric" placeholder="10000"
                className="w-full h-10 rounded-md border px-3"
                value={typeof maxArea === "number" ? maxArea : ""}
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  onChange?.(minArea, v === "" ? undefined : e.currentTarget.valueAsNumber);
                }}
              />
            </div>
          </div>

          <div className="text-xs text-gray-500 mt-2">Kéo để chọn nhanh (0 – 10.000 m²). Lớn hơn thì nhập trực tiếp.</div>

          <DualSlider
            min={0}
            max={areaMax}
            step={areaStep}
            leftValue={minD}
            rightValue={maxD}
            onLeft={(v: number) => onChange?.(Math.min(v, maxD), maxArea)}
            onRight={(v: number) => onChange?.(minArea, Math.max(v, minD))}
            marks={marks}
            rightLabel={`10.000 m²`}
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            {areaPresets.map((p: any, i: number) => (
              <button
                key={i}
                type="button"
                className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 text-left"
                onClick={() => onChange?.(p.min, p.max)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Dual Slider dùng chung ===== */
function DualSlider({
  min, max, step, leftValue, rightValue, onLeft, onRight, marks, rightLabel
}: any) {
  return (
    <div className="mt-3 range-2 relative h-12">
      <div className="absolute top-3 left-0 right-0 h-2 rounded-full track-base" />
      <div
        className="absolute top-3 h-2 rounded-full track-fill"
        style={{ left: `${(leftValue / max) * 100}%`, right: `${(1 - rightValue / max) * 100}%` }}
      />
      {marks.map((m: number) => <div key={m} style={{ left: `${m}%` }} className="mark" />)}
      <div className="absolute left-0 mark-label">0</div>
      <div className="absolute right-0 mark-label">{rightLabel}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={leftValue}
        onChange={(e) => onLeft(Number(e.currentTarget.value))}
        className="top-2 w-full bg-transparent slider-min"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={rightValue}
        onChange={(e) => onRight(Number(e.currentTarget.value))}
        className="top-2 w-full bg-transparent slider-max"
      />
    </div>
  );
}
