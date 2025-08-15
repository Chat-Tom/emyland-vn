// src/components/PropertyCard.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Eye, ShieldCheck, Hourglass } from "lucide-react";
import { Link } from "react-router-dom";
import { renderPosted } from "@utils/date"; // ✅ alias tới /utils/date.ts

export interface PropertyCardProps {
  property: {
    id: string;
    title: string;
    price?: number;             // VND (bán)
    rent_per_month?: number;    // VND/tháng (thuê)
    price_per_m2?: number;      // VND/m² (bán)
    location?: string;
    ward?: string;
    province?: string;
    area: number;
    bedrooms?: number;
    bathrooms?: number;
    images?: any;
    type?: string;              // apartment | house | villa | office | land | social
    verificationStatus?: "verified" | "pending" | "unverified" | string;
    is_verified?: boolean;
    rating?: number;
    listingType?: "sell" | "rent";
    isHot?: boolean;
    createdAt?: string | number | Date;
    [key: string]: any;
  };
}

/* ======== Chip loại nhà đất (đã thêm "social") ======== */
const TYPE_MAP: Record<string, { label: string; color: string }> = {
  apartment: { label: "Căn hộ",        color: "bg-blue-500" },
  house:     { label: "Nhà phố",       color: "bg-green-500" },
  villa:     { label: "Biệt thự",      color: "bg-purple-500" },
  land:      { label: "Nhà đất khác",  color: "bg-orange-500" },
  office:    { label: "Văn phòng",     color: "bg-cyan-600" },
  social:    { label: "Nhà ở xã hội",  color: "bg-sky-500" },
};

const SVG_PLACEHOLDER = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 675'>
     <defs><linearGradient id='g' x1='0' x2='1'>
       <stop stop-color='#2563eb'/><stop offset='1' stop-color='#f97316'/></linearGradient></defs>
     <rect width='1200' height='675' fill='url(#g)'/>
     <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
           fill='white' font-family='Arial' font-size='44'>EmyLand</text>
   </svg>`
);
const PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${SVG_PLACEHOLDER}`;

/** Badge logo thương hiệu gắn góc phải trên ảnh */
const BRAND_BADGE_URL =
  "https://d64gsuwffb70l.cloudfront.net/6884f3c54508990b982512a3_1754128379233_45efa0a3.png";

/* ===== helpers ảnh/địa chỉ/giá ===== */
const firstImg = (pics?: any) => {
  try {
    if (Array.isArray(pics)) return pics.find(Boolean) ?? PLACEHOLDER;
    if (typeof pics === "string") {
      try {
        const arr = JSON.parse(pics);
        if (Array.isArray(arr)) return arr.find(Boolean) ?? PLACEHOLDER;
      } catch {
        const a = pics.split(",").map((s) => s.trim()).filter(Boolean);
        if (a.length) return a[0];
      }
    }
    if (pics && typeof pics === "object" && Array.isArray(pics.urls)) {
      return pics.urls.find(Boolean) ?? PLACEHOLDER;
    }
  } catch {}
  return PLACEHOLDER;
};

function addressOf(ward?: string, province?: string, fallback?: string) {
  return [ward, province].filter(Boolean).join(", ") || fallback || "";
}

function formatPrice(
  listingType: "sell" | "rent" | undefined,
  price?: number,
  rent?: number
) {
  const value = listingType === "rent" ? rent ?? price : price;
  if (!value || value <= 0) return "Thoả thuận";

  if (listingType === "rent") {
    const mil = Math.round(value / 1_000_000);
    return `${mil.toLocaleString("vi-VN")} triệu/tháng`;
  }
  if (value >= 1_000_000_000) {
    const ty = Number((value / 1_000_000_000).toFixed(2));
    return `${ty.toLocaleString("vi-VN")} tỷ`;
  }
  const mil = Math.round(value / 1_000_000);
  return `${mil.toLocaleString("vi-VN")} triệu`;
}

function formatPricePerM2(
  listingType: "sell" | "rent" | undefined,
  area: number,
  price_per_m2?: number,
  price?: number
) {
  if (listingType !== "sell" || !area || area <= 0) return null;
  let val = price_per_m2 ?? (price ?? 0) / area;
  if (!val || val <= 0) return null;
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)} tỷ/m²`;
  return `${(val / 1_000_000).toFixed(2)} triệu/m²`;
}

/* ===== Chuẩn hoá & suy luận loại BĐS để đồng bộ chip ===== */
function deburrLower(s?: string) {
  if (!s) return "";
  try { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
  catch { return String(s).toLowerCase().trim(); }
}

function pickFirst(...vals: any[]) {
  for (const v of vals) if (v !== undefined && v !== null && `${v}`.trim() !== "") return v;
  return undefined;
}

/** Trả về code: apartment/house/villa/office/land/social */
function getTypeCode(p: any): string | undefined {
  const raw = pickFirst(
    p?.type,
    p?.propertyType,
    p?.category,
    p?.kind,
    p?.segment,
    p?.group
  );
  const s = deburrLower(typeof raw === "string" ? raw : "");

  // ưu tiên "Nhà ở xã hội"
  if (s.includes("xa hoi") || s.includes("social")) return "social";

  if (s.includes("can ho") || s.includes("chung cu")) return "apartment";
  if (
    s.includes("nha dat rieng") || s.includes("nha rieng") || s.includes("nha pho") ||
    (s.startsWith("nha") && !s.includes("biet thu"))
  ) return "house";
  if (s.includes("biet thu") || s.includes("villa")) return "villa";
  if (s.includes("van phong") || s.includes("office")) return "office";

  // nhóm còn lại xem là "land"
  if (
    s.includes("dat") || s.includes("dat nen") || s.includes("mat bang") ||
    s.includes("kho") || s.includes("xuong") || s.includes("khach san") ||
    s.includes("nha tro") || s.includes("phong tro") || s.includes("nha vuon")
  ) return "land";

  // nếu DB đã set chuẩn mã code thì trả lại luôn
  if (["apartment","house","villa","office","land","social"].includes(String(p?.type))) {
    return p.type;
  }

  return undefined;
}

/* ===== Suy luận trạng thái xác minh ===== */
function getVerificationStatus(p: any): "verified" | "pending" | "unverified" {
  if (p?.verificationStatus) {
    const s = deburrLower(String(p.verificationStatus));
    if (s.includes("verified") || s.includes("da xac nhan")) return "verified";
    if (s.includes("pending") || s.includes("dang xac nhan")) return "pending";
  }
  if (p?.is_verified === true || p?.isVerified === true || p?.verified === true || p?.owner_verified === true)
    return "verified";
  if (p?.is_verified === false || p?.verified === false) return "pending";
  if (p?.contactInfo?.ownerVerified === true) return "verified";
  if (p?.contactInfo?.ownerVerified === false) return "pending";

  const candidates = [
    p?.verification_status, p?.owner_status, p?.ownerStatus,
    p?.status, p?.badge, p?.label, p?.statusBadge, p?.statusLabel,
  ].filter(Boolean).map(String);

  for (const raw of candidates) {
    const s = deburrLower(raw);
    const hasOwner = s.includes("chinh chu");
    if (s.includes("verified") || (hasOwner && s.includes("da"))) return "verified";
    if (s.includes("pending") || s.includes("dang xac nhan") || (hasOwner && s.includes("dang"))) return "pending";
  }
  return "unverified";
}

/* ===== Badge nhỏ trong thân thẻ — MÀU TƯƠI HƠN ===== */
function renderVerifyBadge(finalStatus: "verified" | "pending" | "unverified") {
  if (finalStatus === "verified")
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-green-500 border border-green-600 px-2.5 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
        Đã xác nhận chính chủ
      </span>
    );
  if (finalStatus === "pending")
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-yellow-400 border border-yellow-500 px-2.5 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
        Đang xác nhận chính chủ
      </span>
    );
  return null;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const {
    id, title, price, rent_per_month, price_per_m2, location, ward, province, area,
    bedrooms, bathrooms, images,
    rating = 4.8, listingType, isHot, createdAt,
  } = property;

  // ✅ đồng bộ chip loại nhà đất từ dữ liệu
  const typeCode = getTypeCode(property);
  const typeCfg = typeCode ? TYPE_MAP[typeCode] : undefined;

  const img = firstImg(images);
  const address = addressOf(ward, province, location);
  const priceText = formatPrice(listingType, price, rent_per_month);
  const priceM2Text = formatPricePerM2(listingType, area, price_per_m2, price);
  const finalStatus = getVerificationStatus(property);
  const postedText = createdAt ? renderPosted(createdAt) : "";

  return (
    <Card className="group overflow-hidden border shadow-sm bg-white rounded-2xl hover:shadow-lg transition">
      {/* Ảnh */}
      <div className="relative aspect-video overflow-hidden bg-gray-100">
        <img
          src={img}
          alt={title}
          loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />

        {/* Chips trái */}
        <div className="absolute top-2 left-2 flex gap-2">
          {typeCfg && (
            <Badge className={`${typeCfg.color} text-white font-semibold px-2.5 py-1`}>
              {typeCfg.label}
            </Badge>
          )}
          {listingType && (
            <Badge className="bg-white/85 text-gray-800 font-semibold px-2.5 py-1 border">
              {listingType === "sell" ? "Bán" : "Thuê"}
            </Badge>
          )}
          {isHot && <Badge className="bg-red-500 text-white font-semibold px-2.5 py-1">HOT</Badge>}
        </div>

        {/* ✅ Góc phải: logo thương hiệu + trạng thái chính chủ */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-2">
          <img
            src={BRAND_BADGE_URL}
            alt="EmyLand"
            className="h-7 w-7 rounded-full bg-white/95 ring-2 ring-white shadow-md"
            loading="lazy"
          />
          {finalStatus === "verified" && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold
                             text-white bg-green-500/95 backdrop-blur
                             px-3 py-1 rounded-full border border-green-600 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              Đã xác nhận chính chủ
            </span>
          )}
          {finalStatus === "pending" && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold
                             text-white bg-yellow-400/95 backdrop-blur
                             px-3 py-1 rounded-full border border-yellow-500 shadow-sm">
              <Hourglass className="w-3.5 h-3.5" />
              Đang xác nhận chính chủ
            </span>
          )}
        </div>

        {/* Giá — ✅ đổi sang xanh tươi đồng bộ nút “Đăng tin miễn phí” */}
        <div className="absolute bottom-2 left-2 space-y-1">
          <span className="inline-flex text-white text-sm font-bold px-3 py-1 rounded-full bg-gradient-to-r from-green-500 to-green-600 shadow">
            {priceText}
          </span>
          {priceM2Text && (
            <span className="inline-flex text-white text-xs font-semibold px-3 py-0.5 rounded-full bg-green-600/90 shadow-sm">
              {priceM2Text}
            </span>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2">{title}</h3>

        {/* badge nhỏ trong thân thẻ */}
        {renderVerifyBadge(finalStatus)}

        <div className="flex items-center text-sm text-gray-600 gap-1.5">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="truncate">{address}</span>
        </div>

        <div className="text-sm text-gray-700 font-medium">
          {area ?? "--"} m²
          {typeof bedrooms === "number" ? ` • ${bedrooms} PN` : ""}
          {typeof bathrooms === "number" ? ` • ${bathrooms} WC` : ""}
          {postedText ? <span className="text-gray-500 font-normal"> • {postedText}</span> : null}
        </div>

        <div className="flex items-center gap-1 text-yellow-500">
          <Star className="h-4 w-4 fill-yellow-500" />
          <span className="text-sm">{Number(rating ?? 0).toFixed(1)}</span>
        </div>

        <Link to={`/property/${id}`} className="block pt-1">
          <Button className="w-full font-semibold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 active:scale-[0.99] text-white shadow-md hover:shadow-lg transition">
            <Eye className="h-4 w-4 mr-2" />
            Xem chi tiết
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
