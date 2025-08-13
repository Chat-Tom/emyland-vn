// src/pages/PropertyDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ✅ THÊM: nguồn dữ liệu thật và fallback local
import { PropertyService } from "@/services/propertyService";
import { StorageManager, type PropertyListing } from "@utils/storage";

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

// ✅ Placeholder SVG nội tuyến để không bị trắng khi lỗi ảnh
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

/* ---------- Helpers ---------- */
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

/* ---------- Normalize (giữ toàn bộ logic cũ) ---------- */
function normalizeProperty(raw: any): Property {
  if (!raw) return { id: "", title: "Tin bất động sản" };

  const images: string[] =
    raw.images ?? raw.photos ?? (raw.imageUrl ? [raw.imageUrl] : []) ?? [];

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
    price: raw.price ?? raw.priceVnd ?? raw.sellPrice ?? raw.rentPrice ?? raw.amount,
    listingType:
      raw.listingType ?? (raw.rentPrice || raw.isRent ? "rent" : raw.isSell ? "sell" : undefined),

    addressLine: raw.addressLine ?? raw.address ?? raw.streetAddress,
    ward: raw.ward ?? raw.commune ?? raw.wardName,
    district: raw.district ?? raw.districtName ?? raw.cityDistrict,
    province: raw.province ?? raw.city ?? raw.provinceName,
    location: typeof raw.location === "string" ? raw.location : raw.fullAddress,

    area: raw.area ?? raw.acreage ?? raw.size ?? raw.square,
    bedrooms: raw.bedrooms ?? raw.bedroom ?? raw.bed ?? raw.rooms?.bedrooms,
    bathrooms: raw.bathrooms ?? raw.bathroom ?? raw.rooms?.bathrooms,

    images,
    description: raw.description ?? raw.desc ?? raw.content,
    verificationStatus: raw.verificationStatus ?? (raw.isOwnerVerified ? "verified" : undefined),

    ownerName: raw.ownerName ?? raw.contactName ?? raw.sellerName,
    ownerPhone: raw.ownerPhone ?? raw.phone ?? raw.contactPhone ?? raw.sellerPhone,

    latitude,
    longitude,
    mapUrl,

    type: raw.type ?? raw.propertyType,
    rating: raw.rating ?? 4.8,
  };
}

// ✅ THÊM: chuẩn hoá từ localStorage (tin do người dùng đăng trên site)
function normalizeFromLocal(p: PropertyListing | null): Property | null {
  if (!p) return null;
  return {
    id: p.id,
    title: p.title || "Tin bất động sản",
    price: typeof p.price === "number" ? p.price : undefined,
    listingType: "sell",
    addressLine: p.location?.address,
    ward: p.location?.ward,
    district: p.location?.district,
    province: p.location?.province,
    location: [p.location?.address, p.location?.ward, p.location?.province].filter(Boolean).join(", "),
    area: Number(p.area || 0),
    bedrooms: (p as any).bedrooms, // nếu có
    bathrooms: (p as any).bathrooms, // nếu có
    images: Array.isArray(p.images) ? p.images : [],
    description: p.description,
    verificationStatus: p.contactInfo?.ownerVerified ? "verified" : undefined,
    ownerName: p.contactInfo?.name,
    ownerPhone: p.contactInfo?.phone,
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

/* ---------- Page ---------- */
export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { property?: any } };

  const stateProp = location.state?.property ? normalizeProperty(location.state.property) : undefined;

  // ✅ SỬA: fetch thật theo id → Supabase trước, không có thì fallback local
  const { data: fetchedProp, isLoading } = useQuery<Property | null>({
    queryKey: ["property-detail", id],
    enabled: !stateProp && !!id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!id) return null;

      // 1) Supabase
      const db = await PropertyService.getPropertyById(id);
      if (db) return normalizeProperty(db);

      // 2) Fallback localStorage (tin từ Dashboard/đăng mới)
      const local = StorageManager.getPropertyById(id);
      const normalizedLocal = normalizeFromLocal(local);
      if (normalizedLocal) return normalizedLocal;

      // 3) Không có
      return null;
    },
  });

  const property = stateProp ?? fetchedProp ?? null;

  // Gallery state
  const pics = useMemo(
    () => (property?.images?.length ? property.images : [PLACEHOLDER]),
    [property]
  );
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [property?.id]);

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
    <div className="bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Top actions – bỏ hẳn ô trống bên phải */}
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>Quay lại</Button>
        </div>

        {/* Gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 rounded-xl overflow-hidden bg-gray-100">
            <img
              src={pics[active] || PLACEHOLDER}
              onError={(e) => ((e.currentTarget as HTMLImageElement).src = PLACEHOLDER)}
              className="w-full aspect-[16/9] object-cover"
              alt={property.title}
            />
          </div>

        {/* Chỉ render thumbnail khi có >1 ảnh */}
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
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
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

          {/* Summary row */}
          <div className="text-gray-700 text-base leading-relaxed">
            <div className="mb-1">{address}</div>
            <div className="font-medium">
              {(property.area ?? "--") + " m²"}
              {typeof property.bedrooms === "number" ? ` • ${property.bedrooms} PN` : ""}
              {typeof property.bathrooms === "number" ? ` • ${property.bathrooms} WC` : ""}
            </div>
          </div>
        </div>

        {/* Contact card (2 cột desktop, 1 cột mobile) */}
        {(property.ownerName || property.ownerPhone || mapsLink) && (
          <div className="mt-6 rounded-xl border bg-gray-50">
            <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-center">
              {/* Left: info */}
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

              {/* Right: actions */}
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

        {/* Description */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Mô tả chi tiết</h2>
          <p className="text-gray-700 leading-relaxed">
            {property.description || "Chưa có mô tả cho tin đăng này."}
          </p>
        </div>
      </div>
    </div>
  );
}
