import { useEffect, useMemo, useRef, useState, useCallback, FormEvent } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
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

/** Favicon */
const FAVICON_URL =
  "https://d64gsuwffb70l.cloudfront.net/6884f3c54508990b982512a3_1754128379233_45efa0a3.png";
function setFavicon(url: string) {
  try {
    const rels = ["icon", "shortcut icon", "apple-touch-icon"];
    rels.forEach((rel) => {
      let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement("link");
        (link as any).rel = rel as any;
        document.head.appendChild(link);
      }
      link.href = url;
      if (!link.type) link.type = "image/png";
    });
  } catch {}
}

/* >>> Added: helpers suy luận PN/WC tại Home để điền sẵn dữ liệu cho Card */
function _deburrLower(s?: string) {
  if (!s) return "";
  try { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
  catch { return String(s).toLowerCase(); }
}
function _toPosInt(v: any): number | undefined {
  if (typeof v === "number" && v > 0) return Math.round(v);
  if (typeof v === "string") {
    const m = v.match(/\d+/);
    const n = m ? Number(m[0]) : NaN;
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}
function _inferRoomsHome(p: any): { bedrooms?: number; bathrooms?: number } {
  let bedrooms =
    _toPosInt(p?.bedrooms) ??
    _toPosInt(p?.bedroom_count) ??
    _toPosInt(p?.bed) ??
    _toPosInt(p?.rooms?.bedrooms) ??
    _toPosInt(p?.details?.bedrooms);

  let bathrooms =
    _toPosInt(p?.bathrooms) ??
    _toPosInt(p?.bathroom_count) ??
    _toPosInt(p?.bath) ?? _toPosInt(p?.wc) ?? _toPosInt(p?.WC) ??
    _toPosInt(p?.toilet) ?? _toPosInt(p?.toilets) ??
    _toPosInt(p?.numBathrooms) ??
    _toPosInt(p?.rooms?.bathrooms) ??
    _toPosInt(p?.details?.bathrooms);

  const hay = _deburrLower([p?.title, p?.description, p?.summary, p?.content, p?.note, p?.details].filter(Boolean).join(" "));
  if (!bedrooms) {
    const m = hay.match(/(\d+)\s*(pn|phong\s*ngu|\bn\b)/i);
    if (m) bedrooms = Number(m[1]);
  }
  if (!bathrooms) {
    const m1 = hay.match(/(\d+)\s*(wc|ve\s*sinh|vs)\b/i);
    const m2 = !m1 && hay.match(/(\d+)\s*(phong\s*tam|phòng\s*tắm|toilet|nha\s*tam|bath(room)?s?)\b/i);
    const mm = m1 || m2;
    if (mm) bathrooms = Number(mm[1]);
  }
  return { bedrooms, bathrooms };
}

/** Chuẩn hoá cho PropertyCard */
function normalizeForCard(p: any) {
  const id = String(p.id ?? p._id ?? (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`));
  const title = p.title ?? p.name ?? p.headline ?? "Tin đăng bất động sản";

  const listingType: ListingType =
    (p.listingType as ListingType) ??
    (p.for_rent ? "rent" : undefined) ??
    (p.for_sale ? "sell" : undefined) ??
    (p.rent_per_month ? "rent" : "sell");

  const price: number | undefined =
    p.price ?? p.sale_price ?? p.asking_price ?? (listingType === "sell" ? p.total_price : undefined);

  const rent_per_month: number | undefined =
    p.rent_per_month ?? p.monthly_rent ?? p.rent ?? (listingType === "rent" ? p.price : undefined);

  const area: number = Number(p.area ?? p.acreage ?? p.squareMeters ?? p.sqm ?? p.size) || 0;

  const price_per_m2: number | undefined =
    p.price_per_m2 ?? (listingType === "sell" && area > 0 && price ? Math.round(price / area) : undefined);

  const ward = p.ward ?? p.wardName ?? p.commune ?? p.subdistrict ?? "";
  const province = p.province ?? p.provinceName ?? p.city ?? p.region ?? "";
  const location =
    p.location ??
    p.address ??
    [p.street, p.district || p.districtName, ward, province].filter(Boolean).join(", ");

  const images =
    p.images ?? p.imageUrls ?? p.photos ?? p.gallery ?? (p.media && (p.media.urls || p.media)) ?? p.cover;

  const type: string | undefined = p.type ?? p.category ?? p.propertyType ?? p.kind ?? undefined;

  const verificationStatus =
    p.verificationStatus ?? (p.is_verified ? "verified" : undefined) ?? (p.verified ? "verified" : undefined);
  const is_verified: boolean | undefined = p.is_verified ?? p.verified ?? (verificationStatus === "verified");

  const bedrooms: number | undefined = p.bedrooms ?? p.bedroom_count ?? p.bed ?? undefined;
  const bathrooms: number | undefined = p.bathrooms ?? p.bathroom_count ?? p.bath ?? undefined;

  const isHot: boolean | undefined = p.isHot ?? p.hot ?? undefined;
  const rating: number | undefined = Number(p.rating ?? 4.8);

  const createdAt: string | number | Date | undefined =
    p.createdAt ?? p.created_at ?? p.postedAt ?? p.updatedAt ?? p.date ?? p.created;

  /* >>> Added: điền sẵn PN/WC nếu thiếu bằng alias + mô tả */
  const guessed = _inferRoomsHome(p);
  const bedroomsFixed = bedrooms ?? guessed.bedrooms;
  const bathroomsFixed = bathrooms ?? guessed.bathrooms;

  return {
    ...p,
    id,
    title,
    price,
    rent_per_month,
    price_per_m2,
    location,
    ward,
    province,
    area,
    bedrooms: bedroomsFixed,          // >>> Added
    bathrooms: bathroomsFixed,        // >>> Added
    images,
    type,
    verificationStatus,
    is_verified,
    rating,
    listingType,
    isHot,
    createdAt,
  };
}

/* —— đoán/nhãn —— */
function deburrLower(s?: string) {
  if (!s) return "";
  try { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
  catch { return String(s).toLowerCase(); }
}
function guessTypeFromResults(list: any[]): string | undefined {
  const counts: Record<string, number> = {};
  for (const p of list ?? []) {
    let t: any = p?.type ?? p?.category ?? p?.propertyType ?? p?.kind;
    const raw = deburrLower(String(t || p?.badge || p?.label || ""));
    let key: string | undefined;
    if (raw === "land" || raw.includes("dat")) key = "land";
    else if (raw === "apartment" || raw.includes("can ho") || raw.includes("apartment")) key = "apartment";
    else if (raw === "villa" || raw.includes("biet thu") || raw.includes("villa")) key = "villa";
    else if (raw === "office" || raw.includes("van phong") || raw.includes("office")) key = "office";
    else if (raw === "house" || raw.includes("nha")) key = "house";
    if (key) counts[key] = (counts[key] ?? 0) + 1;
  }
  let best: string | undefined, bestN = 0;
  for (const k in counts) if (counts[k] > bestN) { best = k; bestN = counts[k]; }
  return best;
}
function isSocialRecord(p: any) {
  const hay = deburrLower(
    [p?.type, p?.category, p?.propertyType, p?.kind, p?.badge, p?.label, p?.title].filter(Boolean).join(" ")
  );
  return hay.includes("xa hoi") || hay.includes("social");
}
function isTypeRecord(p: any, want: string) {
  const raw = deburrLower([p?.type, p?.category, p?.propertyType, p?.kind, p?.badge, p?.label, p?.title].filter(Boolean).join(" "));
  if (want === "apartment") return raw.includes("apartment") || raw.includes("can ho");
  if (want === "house")     return raw.includes("house") || raw.includes("nha");
  if (want === "villa")     return raw.includes("villa") || raw.includes("biet thu");
  if (want === "office")    return raw.includes("office") || raw.includes("van phong");
  if (want === "land")      return raw.includes("land") || raw.includes("dat");
  return true;
}

export default function Home() {
  const location = useLocation();

  // Search state
  const [listingType, setListingType] = useState<ListingType>("sell");
  const [province, setProvince] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [minArea, setMinArea] = useState<number | undefined>(undefined);
  const [maxArea, setMaxArea] = useState<number | undefined>(undefined);

  // Social Housing mode
  const [socialMode, setSocialMode] = useState<boolean>(false);
  const SOCIAL_TYPE_VALUE = "social";

  // Paging & totals
  const [sp, setSp] = useSearchParams();
  const initPage = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const [page, setPage] = useState<number>(initPage);
  const [pageSize] = useState<number>(24);
  const [total, setTotal] = useState<number>(0);
  const [totalAll, setTotalAll] = useState<number>(0);

  /* >>> Added: helper điều hướng tab qua URL (1 nguồn sự thật) */
  const goTab = useCallback((tab: "sell" | "rent" | "social") => {
    setSp((prev) => {
      const q = new URLSearchParams(prev);
      q.set("tab", tab);
      q.set("page", "1");
      return q;
    });
  }, [setSp]);

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

  // Debounce auto-apply
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

  // Totals
  const loadTotals = useCallback(async () => {
    try {
      const { total: all } = await PropertyService.getPropertiesPaged(undefined, { page: 1, pageSize: 1 });
      setTotalAll(all);
    } catch {
      setTotalAll(0);
    }
  }, []);

  // Latest
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

  // Load by filters (server không nhận 'type')
  const loadFromSupabase = useCallback(async (nextPage = page, overrides?: Partial<{
    minPrice: number | undefined; maxPrice: number | undefined;
    minArea: number | undefined; maxArea: number | undefined;
    province: string; type: string;
  }>) => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        listingType,
        province: ((overrides?.province ?? province) || undefined),
        minPrice: overrides?.minPrice ?? minPrice,
        maxPrice: overrides?.maxPrice ?? maxPrice,
        minArea: overrides?.minArea ?? minArea,
        maxArea: overrides?.maxArea ?? maxArea,
      } as any;

      const res = await PropertyService.getPropertiesPaged(filters, { page: nextPage, pageSize });
      let items = res.items as DBProperty[];
      let t = res.total as number;

      const wantType = overrides?.type ?? (socialMode ? SOCIAL_TYPE_VALUE : type);
      if (wantType) {
        items = items.filter((p) =>
          wantType === SOCIAL_TYPE_VALUE ? isSocialRecord(p) : isTypeRecord(p, wantType)
        );
        t = items.length;                    // (giữ dòng cũ)
        t = res.total as number;             // >>> Fix: dùng tổng từ server để phân trang hiển thị đúng
      }

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
  }, [listingType, province, type, minPrice, maxPrice, minArea, maxArea, page, pageSize, socialMode]);

  // react to mode switch
  useEffect(() => {
    setPage(1);
    setSp((prev) => { const q = new URLSearchParams(prev); q.set("page", "1"); return q; });
    setMinPrice(undefined); setMaxPrice(undefined);
    setMinArea(undefined); setMaxArea(undefined);

    const nextType = socialMode ? SOCIAL_TYPE_VALUE : type === SOCIAL_TYPE_VALUE ? "" : type;
    if (socialMode && type !== SOCIAL_TYPE_VALUE) setType(SOCIAL_TYPE_VALUE);
    if (!socialMode && type === SOCIAL_TYPE_VALUE) setType("");

    loadFromSupabase(1, { type: nextType });
    loadTotals();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingType, socialMode]);

  // >>> Added: ref chốt để tránh set state lần 2 khi click tab
  const tabClickRef = useRef<"sell" | "rent" | "social" | null>(null);

  // read ?tab=
  useEffect(() => {
    const q = new URLSearchParams(location.search || "");
    const tab = (q.get("tab") || "").toLowerCase() as "sell" | "rent" | "social" | "";

    // >>> Added: nếu chính tay vừa click tab, bỏ qua set lần 2
    if (tabClickRef.current && tab === tabClickRef.current) {
      tabClickRef.current = null;
      return;
    }

    /* >>> Guard cũ: nếu trạng thái đã đúng thì bỏ qua để tránh render/lần load thứ 2 */
    if (tab === "sell"   && !socialMode && listingType === "sell") return;
    if (tab === "rent"   && !socialMode && listingType === "rent") return;
    if (tab === "social" &&  socialMode) return;

    if (tab === "sell") { setSocialMode(false); setListingType("sell"); }
    else if (tab === "rent") { setSocialMode(false); setListingType("rent"); }
    else if (tab === "social") { setSocialMode(true); }
  }, [location.search, socialMode, listingType]);  // >>> Added deps giữ nguyên

  // sync page from url
  useEffect(() => {
    const p = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
    if (p !== page) setPage(p);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  useEffect(() => { setFavicon(FAVICON_URL); }, []);
  useEffect(() => { loadTotals(); }, [loadTotals]);

  // load latest on empty
  useEffect(() => {
    if (!loading && properties.length === 0) loadLatest();
  }, [loading, properties.length, loadLatest]);

  // reset by header logo
  useEffect(() => {
    const handler = () => {
      setSocialMode(false);
      setListingType("sell");
      setProvince("");
      setType("");
      setMinPrice(undefined); setMaxPrice(undefined);
      setMinArea(undefined); setMaxArea(undefined);
      setPage(1);
      setSp((prev) => { const q = new URLSearchParams(prev); q.set("page", "1"); return q; });
      loadFromSupabase(1, { province: "", type: "", minPrice: undefined, maxPrice: undefined, minArea: undefined, maxArea: undefined });
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("emyland:resetHome", handler);
    return () => window.removeEventListener("emyland:resetHome", handler);
  }, [loadFromSupabase, setSp]);

  // auto refresh when localStorage changes
  useEffect(() => {
    const refreshAll = () => {
      loadFromSupabase(1, { type: socialMode ? SOCIAL_TYPE_VALUE : type });
      loadTotals();
      loadLatest();
      setPage(1);
      setSp((prev) => { const q = new URLSearchParams(prev); q.set("page","1"); return q; });
    };
    const onCustom = () => refreshAll();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "emyland_properties_updated") refreshAll();
    };
    window.addEventListener("emyland:properties-changed", onCustom as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("emyland:properties-changed", onCustom as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [loadFromSupabase, loadLatest, loadTotals, socialMode, type, setSp]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
      setSp((prev) => { const q = new URLSearchParams(prev); q.set("page", String(totalPages)); return q; });
    }
  }, [page, totalPages, setSp]);

  const goPage = (p: number) => {
    const np = Math.max(1, Math.min(totalPages, p));
    if (np === page) return;
    setPage(np);
    setSp((prev) => { const q = new URLSearchParams(prev); q.set("page", String(np)); return q; });
    loadFromSupabase(np, { type: socialMode ? SOCIAL_TYPE_VALUE : type });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

    const nextType = overrides?.type ?? (socialMode ? SOCIAL_TYPE_VALUE : type);

    if (overrides?.minArea !== undefined) setMinArea(a);
    if (overrides?.maxArea !== undefined) setMaxArea(b);
    if (overrides?.minPrice !== undefined) setMinPrice(pmin);
    if (overrides?.maxPrice !== undefined) setMaxPrice(pmax);
    if (overrides?.province !== undefined) setProvince(overrides.province);
    if (overrides?.type !== undefined) setType(overrides.type);

    setPage(1);
    setSp((prev) => { const q = new URLSearchParams(prev); q.set("page", "1"); return q; });
    await loadFromSupabase(1, { minArea: a, maxArea: b, minPrice: pmin, maxPrice: pmax, province: overrides?.province, type: nextType });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSearch = async (e?: FormEvent) => {
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

  /* ===== Summaries ===== */
  const priceSummary = useMemo(() => {
    const minD = toDisplay(isRent, minPrice);
    const maxD = toDisplay(isRent, maxPrice);
    if ((minPrice === 0 && maxPrice === 0) || (minD === 0 && maxD === 0)) return "Thỏa thuận";
    if (!minD && !maxD) return isRent ? "Mức giá (triệu/tháng)" : "Mức giá (tỷ)";
    if (minD && !maxD) return `Từ ${minD} ${priceUnitShort}`;
    if (!minD && maxD) return `Đến ${maxD} ${priceUnitShort}`;
    return `${minD}–${maxD} ${priceUnitShort}`;
  }, [isRent, minPrice, maxPrice, priceUnitShort]);

  const areaSummary = useMemo(() => {
    if (!minArea && !maxArea) return "Diện tích (m2)";
    if (minArea && !maxArea) return `Từ ${minArea} m²`;
    if (!minArea && maxArea) return `Đến ${maxArea} m²`;
    return `${minArea}–${maxArea} m²`;
  }, [minArea, maxArea]);

  const priceMaxDisplay = isRent ? 100 : 1000;
  const priceStep = 1;
  const areaMax = 10000;
  const areaStep = 50;
  const marks = [0, 25, 50, 75, 100];

  /* ===== Tabs class ===== */
  const tabClass = (active: boolean) =>
    `w-full whitespace-nowrap text-[13px] sm:text-sm md:text-2xl
     leading-none px-2 sm:px-3 md:px-4 py-2 md:py-3 rounded-lg
     font-medium tracking-normal transition-all duration-200
     ${active
       ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow hover:brightness-110"
       : "bg-yellow-500 text-white hover:bg-yellow-600 hover:shadow active:scale-[0.99]"}
     /* >>> Added: chống tràn chữ mobile */
     leading-[1.2] min-h-[44px] text-[12px] tracking-tight`;

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans antialiased">
      <Header
        filters={{
          listingType,
          province,
          type: socialMode ? SOCIAL_TYPE_VALUE : type,
          minPrice,
          maxPrice,
          minArea,
          maxArea,
          priceSummary,
          areaSummary,
          selectedChips: [],
        }}
      />

      {/* HERO */}
      <section className="bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          {/* Tabs */}
          <div className="mb-3 grid grid-cols-[1fr_1.35fr_1fr] sm:grid-cols-[1fr_1.25fr_1fr] md:grid-cols-3 gap-2 sm:gap-3">
            {/* sell */}
            <button
              onClick={() => { tabClickRef.current = "sell"; setSocialMode(false); setListingType("sell"); goTab("sell"); }}
              className={tabClass(!socialMode && listingType === "sell")}
              aria-pressed={!socialMode && listingType === "sell"}
            >
              Nhà đất bán
            </button>
            {/* rent */}
            <button
              onClick={() => { tabClickRef.current = "rent"; setSocialMode(false); setListingType("rent"); goTab("rent"); }}
              className={tabClass(!socialMode && listingType === "rent")}
              aria-pressed={!socialMode && listingType === "rent"}
            >
              Nhà đất cho thuê
            </button>
            {/* social */}
            <button
              onClick={() => { tabClickRef.current = "social"; setSocialMode(true); goTab("social"); }}
              className={tabClass(socialMode === true)}
              aria-pressed={socialMode === true}
            >
              Nhà ở xã hội
            </button>
          </div>

          {/* Filters */}
          <form
            onSubmit={onSearch}
            className="searchbar grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_auto] items-end gap-3 font-sans"
          >
            {/* Province */}
            <div>
              <select
                className="control-11 w-full rounded-md border-2 px-3 text-sm md:text-xl text-gray-900 font-medium appearance-none text-center hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/95"
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

            {/* Type */}
            <div>
              {socialMode ? (
                <button
                  type="button"
                  className="control-11 w-full rounded-md border-2 px-3 text-center bg-white/70 cursor-not-allowed font-medium text-gray-900 text-sm md:text-xl"
                  title="Đang lọc Nhà ở xã hội"
                >
                  Nhà ở xã hội
                </button>
              ) : (
                <select
                  className="control-11 w-full rounded-md border-2 px-3 text-sm md:text-xl text-gray-900 font-medium appearance-none text-center hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/95"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="">{/* placeholder */}Các loại nhà đất</option>
                  <option value="apartment">Căn hộ</option>
                  <option value="house">Nhà đất riêng</option>
                  <option value="villa">Biệt thự</option>
                  <option value="office">Văn phòng</option>
                  <option value="land">Nhà đất khác</option>
                </select>
              )}
            </div>

            {/* Price */}
            <PricePopover
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
              onChangeUnits={(min?: number, max?: number) => {
                const commitMin = min === undefined ? undefined : fromDisplay(isRent, min);
                const commitMax = max === undefined ? undefined : fromDisplay(isRent, max);
                setMinPrice(commitMin);
                setMaxPrice(commitMax);
                scheduleApply({ minPrice: commitMin, maxPrice: commitMax });
              }}
            />

            {/* Area */}
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
              onChange={(min?: number, max?: number) => {
                setMinArea(min);
                setMaxArea(max);
                scheduleApply({ minArea: min, maxArea: max });
              }}
            />

            {/* Search */}
            <div className="flex md:justify-end">
              <button
                type="submit"
                className="control-11-btn w-full md:w-auto px-6 rounded-lg font-semibold bg-red-500 hover:bg-red-600 hover:shadow-lg text-white shadow transition-all active:scale-[0.99]"
              >
                Tìm kiếm
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Styles nhỏ cho controls */}
      <style>{`
        .control-11{height:44px;line-height:44px;padding:0 12px;text-align:center;}
        .control-11-btn{height:44px;display:flex;align-items:center;justify-content:center;}
        .popover-input.control-11-input{height:40px;line-height:40px;padding:0 12px;text-align:center;}
        select.control-11 { text-align-last:center; }
        .control-11 option,
        .control-11 optgroup { text-align:left; font-size:0.8rem; }
        .range-2 .track-base{background:linear-gradient(90deg,#93c5fd,#d8b4fe,#fdba74);opacity:.65;}
        .range-2 .track-fill{background:linear-gradient(90deg,#fbbf24,#ef4444);}
        .range-2 input[type="range"]{-webkit-appearance:none;appearance:none;height:0;position:absolute;left:0;right:0;pointer-events:all;}
        .range-2 input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:20px;height:20px;border-radius:9999px;background:#111;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.25),0 0 0 3px rgba(0,0,0,.1);cursor:pointer;}
        .range-2 input[type="range"]::-moz-range-thumb{width:20px;height:20px;border-radius:9999px;background:#111;border:3px solid #fff;cursor:pointer;box-shadow:0 1px 6px rgba(0,0,0,.25),0 0 0 3px rgba(0,0,0,.1);}
        .range-2 input.slider-min::-webkit-slider-thumb{background:#fbbf24;}
        .range-2 input.slider-max::-webkit-slider-thumb{background:#ef4444;}
        .range-2 .mark{width:6px;height:6px;border-radius:9999px;background:#9ca3af;transform:translateX(-50%);top:22px;position:absolute;}
        .range-2 .mark-label{position:absolute;top:30px;transform:translateX(-50%);font-size:11px;color:#6b7280;}
        @media (min-width: 768px) {
          .control-11{height:56px;line-height:56px;}
          .control-11-btn{height:56px;}
          .popover-input.control-11-input{height:48px;line-height:48px;}
        }
      `}</style>

      {/* COUNTER BAR */}
      <div className="container mx-auto px-4">
        <div className="mt-4 mb-2 px-1 text-sm md:text-base text-gray-700 flex items-center justify-between font-sans">
          <div>
            <span className="font-medium text-gray-900">{total.toLocaleString("vi-VN")}</span> tin phù hợp
          </div>
          <button
            className="hidden sm:inline-flex text-xs md:text-sm px-3 py-1 rounded border hover:bg-gray-50 font-medium"
            onClick={() => {
              setProvince("");
              if (!socialMode) setType("");
              setMinPrice(undefined); setMaxPrice(undefined);
              setMinArea(undefined); setMaxArea(undefined);
              setPage(1);
              setSp((prev) => { const q = new URLSearchParams(prev); q.set("page","1"); return q; });
              loadFromSupabase(1, { province: "", type: socialMode ? SOCIAL_TYPE_VALUE : "", minPrice: undefined, maxPrice: undefined, minArea: undefined, maxArea: undefined });
            }}
          >
            Xóa lọc & xem tất cả
          </button>
        </div>
      </div>

      {/* RESULTS */}
      <main className="flex-1 bg-gray-50 font-sans">
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

              {total > 0 && (               /* >>> Changed: luôn render khi có kết quả để test hiệu ứng chọn trang */
                <PaginationBar page={page} totalPages={totalPages} onChange={goPage} />
              )}
            </>
          ) : (
            <>
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

/* ===== Pagination ===== */
function PaginationBar({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const MAX_BUTTONS = 7;
  const half = Math.floor(MAX_BUTTONS / 2);
  let start = Math.max(1, page - half);
  let end = Math.min(totalPages, start + MAX_BUTTONS - 1);
  if (end - start + 1 < MAX_BUTTONS) start = Math.max(1, end - MAX_BUTTONS + 1);

  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);

  /* >>> Added: formatter 2 chữ số 01/02/… */
  const fmt = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <button
        className="px-3 py-2 rounded border bg-white disabled:opacity-50"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        ‹ Trước
      </button>

      {start > 1 && (
        <>
          <button className="px-3 py-2 rounded border bg-white" onClick={() => onChange(1)}>{fmt(1)}</button>
          {start > 2 && <span className="px-1 text-gray-500">…</span>}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          className={`px-3 py-2 rounded border transition ${page === p ? "bg-black text-white" : "bg-white hover:bg-gray-50"}`}
          aria-current={page === p ? "page" : undefined}
          onClick={() => onChange(p)}
        >
          {fmt(p)} {/* >>> Changed hiển thị 01/02/03 */}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-gray-500">…</span>}
          <button className="px-3 py-2 rounded border bg-white" onClick={() => onChange(totalPages)}>
            {fmt(totalPages)} {/* >>> Changed */}
          </button>
        </>
      )}

      <button
        className="px-3 py-2 rounded border bg-white disabled:opacity-50"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        Sau ›
      </button>
    </div>
  );
}

/* ===== Popover Giá — mở bằng click ===== */
function PricePopover({...props}: any) {
  const {
    summary, show, setShow, isRent,
    minPrice, maxPrice,
    pricePresets, priceMaxDisplay, priceStep, marks, priceUnitShort, priceRefEl,
    onChangeUnits,
  } = props;

  const toD = (isRent: boolean, v?: number) => (!v && v !== 0 ? "" : isRent ? Math.round((v ?? 0) / 1_000_000) : Math.round((v ?? 0) / 1_000_000_000));
  const minD = (toD(isRent, minPrice) as number | "") || 0;
  const maxD = (toD(isRent, maxPrice) as number | "") || priceMaxDisplay;

  const changeMin = (val: number | undefined) => onChangeUnits?.(val, typeof maxD === "number" ? maxD : undefined);
  const changeMax = (val: number | undefined) => onChangeUnits?.(typeof minD === "number" ? minD : undefined, val);

  return (
    <div className="relative" ref={priceRefEl}>
      <button
        type="button"
        onClick={() => setShow((v: boolean) => !v)}
        className="control-11-btn w-full rounded-md border-2 px-3 text-center hover:border-blue-500 hover:bg-white/95 font-medium text-sm md:text-xl bg-white/90 transition"
      >
        {summary}
      </button>
      {show && (
        <div className="absolute z-50 mt-2 w-[520px] max-w-[95vw] rounded-xl border bg-white shadow-xl p-4 right-0 font-sans">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium">Mức giá</div>
            <button className="text-xl leading-none" type="button" onClick={() => setShow(false)}>×</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-600 mb-1">Giá thấp nhất</div>
              <input
                type="number" inputMode="numeric" placeholder="Từ"
                className="popover-input control-11-input w-full rounded-md border px-3 font-medium"
                value={typeof minD === "number" ? minD : ""}
                onChange={(e) => changeMin(e.currentTarget.value === "" ? undefined : Number(e.currentTarget.value))}
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Giá cao nhất</div>
              <input
                type="number" inputMode="numeric" placeholder="Đến"
                className="popover-input control-11-input w-full rounded-md border px-3 font-medium"
                value={typeof maxD === "number" ? maxD : ""}
                onChange={(e) => changeMax(e.currentTarget.value === "" ? undefined : Number(e.currentTarget.value))}
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
            onLeft={(v: number) => changeMin(Math.min(v, typeof maxD === "number" ? maxD : priceMaxDisplay))}
            onRight={(v: number) => changeMax(Math.max(v, typeof minD === "number" ? minD : 0))}
            marks={marks}
            rightLabel={`${priceMaxDisplay} ${priceUnitShort}`}
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            {pricePresets.map((p: any, i: number) => (
              <button key={i} type="button" onClick={() => (p.min === 0 && p.max === 0 ? onChangeUnits?.(0, 0) : onChangeUnits?.(p.min, p.max))} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 text-left font-medium">
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Popover Diện tích — mở bằng click ===== */
function AreaPopover({...props}: any) {
  const { summary, show, setShow, minArea, maxArea, areaPresets, areaMax, areaStep, marks, areaRefEl, onChange } = props;
  const minD = typeof minArea === "number" ? minArea : 0;
  const maxD = typeof maxArea === "number" ? maxArea : areaMax;

  return (
    <div className="relative" ref={areaRefEl}>
      <button type="button" onClick={() => setShow((v: boolean) => !v)} className="control-11-btn w-full rounded-md border-2 px-3 text-center hover:border-blue-500 hover:bg-white/95 font-medium text-sm md:text-xl bg-white/90 transition">
        {summary}
      </button>

      {show && (
        <div className="absolute z-50 mt-2 w-[520px] max-w-[95vw] rounded-xl border bg-white shadow-xl p-4 right-0 font-sans">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium">Diện tích</div>
            <button className="text-xl leading-none" type="button" onClick={() => setShow(false)}>×</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-600 mb-1">Từ</div>
              <input type="number" inputMode="numeric" placeholder="0" className="popover-input control-11-input w-full rounded-md border px-3 font-medium"
                value={typeof minArea === "number" ? minArea : ""} onChange={(e) => onChange?.(e.currentTarget.value === "" ? undefined : e.currentTarget.valueAsNumber, maxArea)} />
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Đến</div>
              <input type="number" inputMode="numeric" placeholder="10000" className="popover-input control-11-input w-full rounded-md border px-3 font-medium"
                value={typeof maxArea === "number" ? maxArea : ""} onChange={(e) => onChange?.(minArea, e.currentTarget.value === "" ? undefined : e.currentTarget.valueAsNumber)} />
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
              <button key={i} type="button" className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 text-left font-medium" onClick={() => onChange?.(p.min, p.max)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Dual Slider ===== */
function DualSlider({ min, max, step, leftValue, rightValue, onLeft, onRight, marks, rightLabel }: any) {
  return (
    <div className="mt-3 range-2 relative h-12">
      <div className="absolute top-3 left-0 right-0 h-2 rounded-full track-base" />
      <div
        className="absolute top-3 h-2 rounded-full track-fill"
        style={{
          left: `${(leftValue / max) * 100}%`,
          right: `${(1 - rightValue / max) * 100}%`,
        }}
      />
      {marks.map((m: number) => (
        <div key={m} style={{ left: `${m}%` }} className="mark" />
      ))}
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
