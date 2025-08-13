import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Eye, ShieldCheck, Hourglass } from "lucide-react";
import { Link } from "react-router-dom";

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
    images?: any;               // array | JSON string | comma-separated | object{urls}
    type?: string;              // apartment | house | land | villa | office
    verificationStatus?: "verified" | "pending" | "unverified" | string;
    is_verified?: boolean;      // từ DB
    rating?: number;
    listingType?: "sell" | "rent";
    isHot?: boolean;
    // khả năng DB có các tên khác:
    [key: string]: any;
  };
}

const TYPE_MAP: Record<string, { label: string; color: string }> = {
  apartment: { label: "Căn hộ",   color: "bg-blue-500" },
  house:     { label: "Nhà phố",  color: "bg-green-500" },
  villa:     { label: "Biệt thự", color: "bg-purple-500" },
  land:      { label: "Đất nền",  color: "bg-orange-500" },
  office:    { label: "Văn phòng",color: "bg-cyan-600" },
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

// ===== helpers =====
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

// Giá theo m²: CHỈ hiển thị cho BÁN
function formatPricePerM2(
  listingType: "sell" | "rent" | undefined,
  area: number,
  price_per_m2?: number,
  price?: number
) {
  if (listingType !== "sell" || !area || area <= 0) return null;
  let val = price_per_m2 ?? (price ?? 0) / area;
  if (!val || val <= 0) return null;

  if (val >= 1_000_000_000) {
    const ty = val / 1_000_000_000;
    return `${ty.toFixed(2)} tỷ/m²`;
  }
  const mil = val / 1_000_000;
  return `${mil.toFixed(2)} triệu/m²`;
}

// ——— Suy luận trạng thái chính chủ từ nhiều biến thể field/chuỗi ———
function deburrLower(s?: string) {
  if (!s) return "";
  try {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  } catch {
    return s.toLowerCase().trim();
  }
}
function getVerificationStatus(p: any): "verified" | "pending" | "unverified" {
  // boolean dạng khác
  if (p?.is_verified || p?.isVerified || p?.verified === true || p?.owner_verified) return "verified";

  // các field text phổ biến
  const candidates = [
    p?.verificationStatus,
    p?.verification_status,
    p?.owner_status,
    p?.ownerStatus,
    p?.status,
    p?.badge,
    p?.label,
  ]
    .filter(Boolean)
    .map((x: any) => String(x));

  for (const raw of candidates) {
    const s = deburrLower(raw);
    if (!s) continue;
    if (
      s.includes("verified") ||
      s.includes("da xac nhan") ||
      (s.includes("xác nhận") && s.includes("đã"))
    ) {
      return "verified";
    }
    if (
      s.includes("pending") ||
      s.includes("dang xac nhan") ||
      (s.includes("xác nhận") && (s.includes("dang") || s.includes("đang")))
    ) {
      return "pending";
    }
  }
  return "unverified";
}

function renderVerifyBadge(finalStatus: "verified" | "pending" | "unverified") {
  if (finalStatus === "verified")
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Đã xác nhận chính chủ
      </span>
    );
  if (finalStatus === "pending")
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Đang xác nhận chính chủ
      </span>
    );
  return null;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const {
    id, title, price, rent_per_month, price_per_m2, location, ward, province, area,
    bedrooms, bathrooms, images, type,
    rating = 4.8, listingType, isHot,
  } = property;

  const img = firstImg(images);
  const address = addressOf(ward, province, location);
  const priceText = formatPrice(listingType, price, rent_per_month);
  const priceM2Text = formatPricePerM2(listingType, area, price_per_m2, price);
  const finalStatus = getVerificationStatus(property);

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
          {type && TYPE_MAP[type] && (
            <Badge className={`${TYPE_MAP[type].color} text-white font-semibold px-2.5 py-1`}>
              {TYPE_MAP[type].label}
            </Badge>
          )}
          {listingType && (
            <Badge className="bg-white/85 text-gray-800 font-semibold px-2.5 py-1 border">
              {listingType === "sell" ? "Bán" : "Thuê"}
            </Badge>
          )}
          {isHot && <Badge className="bg-red-500 text-white font-semibold px-2.5 py-1">HOT</Badge>}
        </div>

        {/* Overlay trạng thái chính chủ (điểm nhấn) */}
        <div className="absolute top-2 right-2">
          {finalStatus === "verified" && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold
                             text-emerald-800 bg-emerald-50/95 backdrop-blur
                             px-3 py-1 rounded-full border border-emerald-200 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              Đã xác nhận chính chủ
            </span>
          )}
          {finalStatus === "pending" && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold
                             text-amber-800 bg-amber-50/95 backdrop-blur
                             px-3 py-1 rounded-full border border-amber-200 shadow-sm">
              <Hourglass className="w-3.5 h-3.5" />
              Đang xác nhận chính chủ
            </span>
          )}
        </div>

        {/* Giá chính + Giá/m² (chỉ khi Bán) */}
        <div className="absolute bottom-2 left-2 space-y-1">
          <span className="inline-flex text-white text-sm font-bold px-3 py-1 rounded-full bg-black/60">
            {priceText}
          </span>
          {priceM2Text && (
            <span className="inline-flex text-white text-xs font-medium px-3 py-0.5 rounded-full bg-black/50">
              {priceM2Text}
            </span>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2">{title}</h3>

        {/* badge nhỏ trong thân thẻ (phụ) */}
        {renderVerifyBadge(finalStatus)}

        <div className="flex items-center text-sm text-gray-600 gap-1.5">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="truncate">{address}</span>
        </div>

        <div className="text-sm text-gray-700 font-medium">
          {area ?? "--"} m²
          {typeof bedrooms === "number" ? ` • ${bedrooms} PN` : ""}
          {typeof bathrooms === "number" ? ` • ${bathrooms} WC` : ""}
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
