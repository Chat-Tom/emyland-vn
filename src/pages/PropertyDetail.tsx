// src/pages/PropertyDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// dữ liệu thật + fallback local
import { PropertyService } from "@/services/propertyService";
import { StorageManager, type PropertyListing } from "@utils/storage";
/* >>> added: gọi trực tiếp Supabase để tránh lỗi 400/406 */
import { supabase } from "@/lib/supabase";

type ListingType = "sell" | "rent";
type Verify = "verified" | "pending" | "unverified";

type Property = {
  id: string;
  title: string;
  price?: number;
  listingType?: ListingType;
  addressLine?: string;
  ward?: string;
  district?: string;
  province?: string;
  location?: string;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  images?: string[];
  description?: string;
  verificationStatus?: Verify;
  ownerName?: string;
  ownerPhone?: string;
  latitude?: number;
  longitude?: number;
  mapUrl?: string;
  type?: string;
  rating?: number;
};

// placeholder ảnh an toàn
const FALLBACK_SVG = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 675'>
    <defs><linearGradient id='g' x1='0' x2='1'>
      <stop stop-color='#2563eb'/><stop offset='1' stop-color='#f97316'/></linearGradient></defs>
    <rect width='1200' height='675' fill='url(#g)'/>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
      fill='white' font-family='Arial' font-size='44'>EmyLand</text>
  </svg>`
);
const PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${FALLBACK_SVG}`;

/* ===== helpers ===== */
/* >>> added: ép số an toàn */
const toNum = (v: any): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
/* >>> added: chuẩn hoá mảng ảnh */
const normalizeImages = (images: any): string[] => {
  try {
    if (Array.isArray(images)) return images.filter(Boolean);
    if (typeof images === "string") {
      try {
        const arr = JSON.parse(images);
        if (Array.isArray(arr)) return arr.filter(Boolean);
      } catch {
        return images.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
  } catch {}
  return [];
};

function formatPriceVn(price?: number, listingType?: ListingType) {
  if (!price || price <= 0) return "Thoả thuận";
  if (listingType === "rent")
    return `${Math.round(price / 1_000_000).toLocaleString("vi-VN")} triệu/tháng`;
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(2)} tỷ`;
  return `${Math.round(price / 1_000_000).toLocaleString("vi-VN")} triệu`;
}
function verifyBadge(status?: Verify) {
  if (status === "verified") return <Badge className="bg-emerald-600 text-white">Đã xác nhận chính chủ</Badge>;
  if (status === "pending") return <Badge className="bg-amber-500 text-white">Đang xác nhận chính chủ</Badge>;
  return null;
}

// renderer nhẹ: escape HTML + hỗ trợ **bold** / *italic* + xuống dòng
function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function renderRichText(raw?: string) {
  const s = escapeHtml(String(raw ?? ""));
  const md = s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
  return md.replace(/\r?\n/g, "<br/>");
}

// chuẩn hoá record từ API
function normalizeProperty(raw: any): Property {
  if (!raw) return { id: "", title: "Tin bất động sản" };

  const images: string[] =
    normalizeImages(raw.images) ||
    normalizeImages(raw.photos) ||
    (raw.imageUrl ? [raw.imageUrl] : []);

  const latitude =
    raw.latitude ?? raw.lat ?? (typeof raw.location === "object" ? raw.location?.lat : undefined);
  const longitude =
    raw.longitude ?? raw.lng ?? (typeof raw.location === "object" ? raw.location?.lng : undefined);
  const mapUrl =
    raw.mapUrl ??
    (latitude && longitude ? `https://www.google.com/maps?q=${latitude},${longitude}` : undefined);

  return {
    id: raw.id ?? raw._id ?? raw.uuid ?? "",
    title: raw.title ?? raw.name ?? raw.heading ?? "Tin bất động sản",
    /* >>> changed: ép về number */
    price: toNum(raw.price ?? raw.priceVnd ?? raw.sellPrice ?? raw.rentPrice ?? raw.amount),
    listingType:
      raw.listingType ?? (raw.rentPrice || raw.isRent ? "rent" : raw.isSell ? "sell" : undefined),

    addressLine: raw.addressLine ?? raw.address ?? raw.streetAddress,
    ward: raw.ward ?? raw.commune ?? raw.wardName,
    district: raw.district ?? raw.districtName ?? raw.cityDistrict,
    province: raw.province ?? raw.city ?? raw.provinceName,
    location: typeof raw.location === "string" ? raw.location : raw.fullAddress,

    /* >>> changed: ép số để hiện PN/WC */
    area: toNum(raw.area ?? raw.acreage ?? raw.size ?? raw.square),
    bedrooms: toNum(raw.bedrooms ?? raw.bedroom ?? raw.bed ?? raw.rooms?.bedrooms),
    bathrooms: toNum(raw.bathrooms ?? raw.bathroom ?? raw.rooms?.bathrooms),

    images,
    description: raw.description ?? raw.desc ?? raw.content,
    verificationStatus:
      (raw.verificationStatus as Verify | undefined) ??
      (raw.isOwnerVerified ? "verified" : undefined),

    ownerName: raw.ownerName ?? raw.contactName ?? raw.sellerName,
    ownerPhone: raw.ownerPhone ?? raw.phone ?? raw.contactPhone ?? raw.sellerPhone,

    latitude,
    longitude,
    mapUrl,

    type: raw.type ?? raw.propertyType,
    rating: raw.rating ?? 4.8,
  };
}

// chuẩn hoá record từ localStorage (tin user đăng)
function normalizeFromLocal(p: PropertyListing | null): Property | null {
  if (!p) return null;

  const listingType: ListingType =
    (p as any).listingType ??
    ((typeof (p as any).rent_per_month === "number" ? "rent" : "sell") as ListingType);

  const price =
    listingType === "rent"
      ? (p as any).rent_per_month
      : typeof (p as any).price === "number"
      ? (p as any).price
      : undefined;

  const verificationStatus: Verify =
    ((p as any).verificationStatus as Verify) ??
    (p.contactInfo?.ownerVerified ? "verified" : "pending");

  return {
    id: p.id,
    title: p.title || "Tin bất động sản",
    price,
    listingType,
    addressLine: p.location?.address,
    ward: p.location?.ward,
    district: p.location?.district,
    province: p.location?.province,
    location: [p.location?.address, p.location?.ward, p.location?.province].filter(Boolean).join(", "),
    area: Number(p.area || 0),
    /* >>> changed: ép số để luôn hiện PN/WC */
    bedrooms: toNum((p as any).bedrooms),
    bathrooms: toNum((p as any).bathrooms),
    images: normalizeImages((p as any).images),
    description: p.description,
    verificationStatus,
    ownerName: p.contactInfo?.name,
    ownerPhone: p.contactInfo?.phone,
    mapUrl: (p as any).mapUrl,
    type: p.propertyType,
    rating: 4.8,
  };
}

const buildMapsLink = (p: Property, address: string) => {
  if (p.mapUrl) return p.mapUrl;
  if (p.latitude && p.longitude) return `https://www.google.com/maps?q=${p.latitude},${p.longitude}`;
  if (address) return `https://www.google.com/maps?q=${encodeURIComponent(address)}`;
  return undefined;
};

// CTA dính trên cùng
const CTA_HOME_URL =
  (import.meta as any)?.env?.VITE_PUBLIC_SITE_URL ||
  (import.meta as any)?.env?.VITE_PUBLIC_SHARE_ORIGIN ||
  "/";

function CTAHomeBar() {
  return (
    <div className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b">
      <div className="mx-auto max-w-6xl px-4 py-2">
        <a
          href={CTA_HOME_URL}
          className="block w-full text-center rounded-xl px-4 py-2 font-semibold text-white
                     bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500
                     hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600
                     shadow-md hover:shadow-lg transition"
          title="Xem thêm nhà đất chính chủ đang cần xả hàng"
        >
          Xem Nhà đất chính chủ cần xả hàng nhiều hơn →
        </a>
      </div>
    </div>
  );
}

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { property?: any } };

  const stateProp = location.state?.property ? normalizeProperty(location.state.property) : undefined;

  // fetch theo id → ưu tiên Supabase, fallback local
  const { data: fetchedProp, isLoading } = useQuery<Property | null>({
    queryKey: ["property-detail", id],
    enabled: !stateProp && !!id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!id) return null;

      /* >>> added: gọi trực tiếp Supabase, tránh 400/406 */
      try {
        const { data, error } = await supabase
          .from("properties")
          .select("*")
          .eq("id", id)
          .limit(1)
          .maybeSingle();
        if (!error && data) return normalizeProperty(data);
      } catch {}

      // Giữ logic cũ: service (nếu đang dùng) rồi mới tới local
      const db = await PropertyService.getPropertyById(id);
      if (db) return normalizeProperty(db);

      const local = StorageManager.getPropertyById(id);
      const normalizedLocal = normalizeFromLocal(local);
      if (normalizedLocal) return normalizedLocal;

      return null;
    },
  });

  const property = stateProp ?? fetchedProp ?? null;

  // gallery
  const pics = useMemo(
    () => (property?.images?.length ? property.images : [PLACEHOLDER]),
    [property]
  );
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [property?.id]);

  // ẩn nút "Quay lại" cũ (không xoá dòng)
  useEffect(() => {
    try {
      const els = Array.from(document.querySelectorAll("button, a"));
      els.forEach((el) => {
        const txt = (el.textContent || "").trim().toLowerCase();
        if (txt === "quay lại" || txt === "quay lai") {
          (el as HTMLElement).style.display = "none";
        }
      });
    } catch {}
  }, []);

  if (!property || (isLoading && !stateProp)) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="h-72 rounded-xl bg-gray-100 animate-pulse" />
        <div className="mt-6 h-8 w-2/3 bg-gray-100 animate-pulse rounded" />
        <div className="mt-3 h-4 w-1/2 bg-gray-100 animate-pulse rounded" />
      </div>
    );
  }

  const addressParts = [property.addressLine, property.ward, property.district, property.province]
    .filter(Boolean)
    .join(", ");
  const fallbackAddress =
    [property.ward, property.province].filter(Boolean).join(", ") || property.location || "";
  const address = addressParts || fallbackAddress;

  const priceText = formatPriceVn(property.price, property.listingType);
  const mapsLink = buildMapsLink(property, address);

  return (
    <>
      <CTAHomeBar />

      <div className="bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* dòng cũ giữ nguyên (đã ẩn bằng effect) */}
          <div className="mb-4">
            <Button variant="ghost" onClick={() => navigate(-1)}>Quay lại</Button>
          </div>

          {/* gallery */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 rounded-xl overflow-hidden bg-gray-100">
              <img
                src={pics[active] || PLACEHOLDER}
                onError={(e) => ((e.currentTarget as HTMLImageElement).src = PLACEHOLDER)}
                className="w-full aspect-[16/9] object-cover"
                alt={property.title}
              />
            </div>

            {pics.length > 1 ? (
              <div className="flex lg:flex-col gap-3">
                {pics.slice(0, 6).map((src, i) => (
                  <button
                    key={src + i}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    className={[
                      "overflow-hidden rounded-lg border bg-gray-100",
                      active === i ? "ring-2 ring-primary" : "opacity-90 hover:opacity-100",
                      "h-24 w-32 lg:h-28 lg:w-auto",
                    ].join(" ")}
                    aria-label={`Ảnh ${i + 1}`}
                  >
                    <img
                      src={src || PLACEHOLDER}
                      onError={(e) => ((e.currentTarget as HTMLImageElement).src = PLACEHOLDER)}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="hidden lg:block" />
            )}
          </div>

          {/* Title & Price */}
          <div className="mt-8 space-y-3">
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight">
              {property.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="text-base font-semibold">{priceText}</Badge>
              {verifyBadge(property.verificationStatus)}
              {property.listingType && (
                <Badge className="bg-blue-600 text-white">
                  {property.listingType === "sell" ? "Nhà đất bán" : "Nhà đất cho thuê"}
                </Badge>
              )}
              {property.type && <Badge variant="outline">{property.type}</Badge>}
            </div>

            {/* Summary */}
            <div className="text-gray-700 text-base leading-relaxed">
              <div className="mb-1">{address}</div>
              <div className="font-medium">
                {(property.area ?? "--") + " m²"}
                {typeof property.bedrooms === "number" ? ` • ${property.bedrooms} PN` : ""}
                {typeof property.bathrooms === "number" ? ` • ${property.bathrooms} WC` : ""}
              </div>
            </div>
          </div>

          {/* Contact */}
          {(property.ownerName || property.ownerPhone || mapsLink) && (
            <div className="mt-6 rounded-xl border bg-gray-50">
              <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-center">
                <div className="md:col-span-2 space-y-1">
                  {property.ownerName && (
                    <div>
                      <span className="text-gray-600">Chủ tin: </span>
                      <span className="font-semibold">{property.ownerName}</span>
                    </div>
                  )}
                  {property.ownerPhone && (
                    <div>
                      <span className="text-gray-600">Điện thoại liên hệ: </span>
                      <a className="text-primary font-semibold underline" href={`tel:${property.ownerPhone}`}>
                        {property.ownerPhone}
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap md:justify-end gap-2">
                  {property.ownerPhone && (
                    <>
                      <a href={`tel:${property.ownerPhone}`}>
                        <Button className="bg-emerald-600 hover:bg-emerald-700">Gọi ngay</Button>
                      </a>
                      <a href={`sms:${property.ownerPhone}`}>
                        <Button variant="outline">Nhắn tin</Button>
                      </a>
                    </>
                  )}
                  {mapsLink && (
                    <a href={mapsLink} target="_blank" rel="noopener noreferrer">
                      <Button variant="secondary">Mở Google Maps</Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Description: giữ định dạng như lúc đăng */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-2">Mô tả chi tiết</h2>
            <div
              className="text-gray-700 leading-relaxed prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: renderRichText(
                  property.description || "Chưa có mô tả cho tin đăng này."
                ),
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
