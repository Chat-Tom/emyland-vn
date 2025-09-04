import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, ShieldCheck, Hourglass, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { renderPosted, verifiedDateLabel } from "../../utils/date";
/* ++ thêm: Portal để vẽ popover ra ngoài thẻ Card */
import { createPortal } from "react-dom";

export interface PropertyCardProps {
  property?: {
    id?: string;
    title?: string;
    price?: number;
    rent_per_month?: number;
    price_per_m2?: number;
    location?: any;
    ward?: string;
    province?: string;
    area?: number;
    bedrooms?: number | string;
    bathrooms?: number | string;
    images?: any;
    type?: string;
    verificationStatus?: "verified" | "pending" | "unverified" | string;
    is_verified?: boolean;
    rating?: number;
    listingType?: "sell" | "rent";
    isHot?: boolean;
    createdAt?: string | number | Date;
    description?: string;
    summary?: string;
    content?: string;
    note?: string;
    details?: string;
    [key: string]: any;
  };
}

const TYPE_MAP: Record<string, { label: string; color: string }> = {
  apartment: { label: "Căn hộ", color: "bg-blue-500" },
  house: { label: "Nhà phố", color: "bg-green-500" },
  villa: { label: "Biệt thự", color: "bg-purple-500" },
  land: { label: "Nhà đất khác", color: "bg-orange-500" },
  office: { label: "Văn phòng", color: "bg-cyan-600" },
  social: { label: "Nhà ở xã hội", color: "bg-sky-500" },
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
const BRAND_BADGE_URL =
  "https://d64gsuwffb70l.cloudfront.net/6884f3c54508990b982512a3_1754128379233_45efa0a3.png";

/* ============ helpers ============ */
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
    if (pics && typeof pics === "object") {
      if (Array.isArray(pics.urls)) return pics.urls.find(Boolean) ?? PLACEHOLDER;
      if (pics.main) return pics.main;
    }
  } catch {}
  return PLACEHOLDER;
};

function addressOf(ward?: string, province?: string, fallback?: any) {
  const txt = [ward, province].filter(Boolean).join(", ");
  if (txt) return txt;
  if (fallback && typeof fallback === "object") {
    const w = fallback.ward || fallback.commune || "";
    const p = fallback.province || fallback.city || "";
    const s = [w, p].filter(Boolean).join(", ");
    if (s) return s;
    return fallback.address || "";
  }
  return typeof fallback === "string" ? fallback : "";
}

function formatPrice(
  listingType: "sell" | "rent" | undefined,
  price?: number,
  rent?: number
) {
  const value = listingType === "rent" ? rent ?? price : price;
  if (!value || value <= 0) return "Thoả thuận";
  if (listingType === "rent") {
    const mil = Math.round((value ?? 0) / 1_000_000);
    return `${mil.toLocaleString("vi-VN")} triệu/tháng`;
  }
  if ((value ?? 0) >= 1_000_000_000) {
    const ty = Number(((value ?? 0) / 1_000_000_000).toFixed(2));
    return `${ty.toLocaleString("vi-VN")} tỷ`;
  }
  return `${Math.round((value ?? 0) / 1_000_000).toLocaleString("vi-VN")} triệu`;
}

function formatPricePerM2(
  listingType: "sell" | "rent" | undefined,
  area?: number,
  price_per_m2?: number,
  price?: number
) {
  if (listingType !== "sell" || !area || area <= 0) return null;
  const val = price_per_m2 ?? (price ?? 0) / area;
  if (!val || val <= 0) return null;
  return val >= 1_000_000_000
    ? `${Math.round(val / 1_000_000_000).toLocaleString("vi-VN")} tỷ/m²`
    : `${Math.round(val / 1_000_000).toLocaleString("vi-VN")} triệu/m²`;
}

/* ===== Chuẩn hoá & suy luận loại ===== */
function deburrLower(s?: string) {
  if (!s) return "";
  try {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  } catch {
    return String(s).toLowerCase().trim();
  }
}
function pickFirst<T>(...vals: T[]) {
  for (const v of vals) {
    // @ts-expect-error
    if (v !== undefined && v !== null && `${v}`.trim?.() !== "") return v;
  }
  return undefined;
}
function mapViLabelToCode(label?: string) {
  const s = deburrLower(label);
  if (!s) return undefined;
  if (/\bvan\s*phong\b|\boffice\b/.test(s)) return "office";
  if (/\bcan\s*ho\b|\bchung\s*cu\b|\bapartment\b/.test(s)) return "apartment";
  if (/\bbiet\s*thu\b|\bvilla\b/.test(s)) return "villa";
  if (/\bnha\s*(pho|rieng|lien\s*ke)\b/.test(s)) return "house";
  if (/\bnha\s*o\s*xa\s*hoi\b|\bsocial\b/.test(s)) return "social";
  if (/\bdat\b|\bmat\s*bang\b|\bkho\b|\bxuong\b/.test(s)) return "land";
}
function getTypeCode(p: any): string | undefined {
  const labels = [
    p?.category, p?.category_label, p?.label, p?.badge, p?.kind, p?.segment,
    p?.type_name, p?.property_type_label, p?.group_label, p?.groupName,
    p?.title, p?.description, p?.summary,
  ].filter(Boolean).map(String);

  let vi: string | undefined;
  for (const raw of labels) {
    const m = mapViLabelToCode(raw);
    if (m) { vi = m; break; }
  }

  const canon = [
    p?.type, p?.type_code, p?.typeCode, p?.property_type, p?.propertyType,
    p?.category_code, p?.categoryCode, p?.group, p?.group_code, p?.groupCode,
  ];
  for (const raw of canon) {
    const v = String(raw ?? "").trim().toLowerCase().replace(/[^a-z]/g, "");
    if (["apartment","house","villa","office","land","social"].includes(v)) {
      if (v === "land" && vi && vi !== "land") return vi;
      return v;
    }
    if (v === "vanphong") return "office";
    if (v === "nhaoxahoi") return "social";
  }

  if (vi) return vi;

  const hay = deburrLower(
    [p?.propertyType,p?.category,p?.kind,p?.segment,p?.group,p?.badge,p?.label,p?.title,p?.description,p?.summary]
      .filter(Boolean).join(" ")
  ).replace(/\bnha\s*dat\b/g,"");

  if (hay.includes("nha o xa hoi") || hay.includes("social")) return "social";
  if (hay.includes("van phong") || hay.includes("office")) return "office";
  if (hay.includes("can ho") || hay.includes("chung cu") || hay.includes("apartment")) return "apartment";
  if (hay.includes("biet thu") || hay.includes("villa")) return "villa";
  if (hay.includes("nha pho") || hay.includes("nha rieng") || (hay.startsWith("nha") && !hay.includes("biet thu"))) return "house";
  if (/\b(dat\s*nen|mat\s*bang|kho|xuong|khach\s*san|nha\s*tro|phong\s*tro|nha\s*vuon)\b/.test(hay) || /\bdat\b/.test(hay)) return "land";
}

/* ===== Listing type ===== */
function getListingType(p: any): "sell" | "rent" | undefined {
  const direct = p?.listingType ?? p?.listing_type ?? p?.deal_type ?? p?.offer_type;
  if (direct === "sell" || direct === "rent") return direct;
  const s = deburrLower(String(direct ?? [p?.category,p?.label,p?.badge,p?.title].filter(Boolean).join(" ")));
  if (/\b(cho\s*thue|thuê|rent)\b/.test(s)) return "rent";
  if (/\b(ban|bán|sell)\b/.test(s)) return "sell";
}

/* ===== Verification ===== */
function getVerificationStatus(p: any): "verified" | "pending" | "unverified" {
  if (p?.verificationStatus) {
    const s = deburrLower(String(p.verificationStatus));
    if (s.includes("verified") || s.includes("da xac nhan")) return "verified";
    if (s.includes("pending") || s.includes("dang xac nhan")) return "pending";
  }
  if (p?.is_verified === true || p?.isVerified === true || p?.verified === true || p?.owner_verified === true) return "verified";
  if (p?.is_verified === false || p?.verified === false) return "pending";
  if (p?.contactInfo?.ownerVerified === true) return "verified";
  if (p?.contactInfo?.ownerVerified === false) return "pending";

  const cands = [p?.verification_status,p?.owner_status,p?.ownerStatus,p?.status,p?.badge,p?.label,p?.statusBadge,p?.statusLabel].filter(Boolean).map(String);
  for (const raw of cands) {
    const s = deburrLower(raw);
    const hasOwner = s.includes("chinh chu");
    if (s.includes("verified") || (hasOwner && s.includes("da"))) return "verified";
    if (s.includes("pending") || s.includes("dang xac nhan") || (hasOwner && s.includes("dang"))) return "pending";
  }
  return "unverified";
}

/* ===== Description & rooms ===== */
function getShortDescription(p: any): string {
  const raw = pickFirst(p?.description, p?.summary, p?.content, p?.note, p?.details) ?? "";
  return String(raw).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function toPosInt(v: any): number | undefined {
  if (typeof v === "number" && v > 0) return Math.round(v);
  if (typeof v === "string") {
    const m = v.match(/\d+/);
    if (m) {
      const n = Number(m[0]);
      if (n > 0) return n;
    }
  }
  return undefined;
}
function inferRooms(p: any): { bedrooms?: number; bathrooms?: number } {
  const bd = toPosInt(pickFirst(p?.bedrooms,p?.bedroom,p?.numBedrooms,p?.rooms?.bedrooms,p?.bedroom_count));
  const bt = toPosInt(pickFirst(p?.bathrooms,p?.bathroom,p?.numBathrooms,p?.rooms?.bathrooms,p?.bathroom_count,p?.wc));
  let bedrooms = bd, bathrooms = bt;

  if (!bathrooms) {
    const wcAliases = [p?.WC,p?.wc,p?.toilets,p?.toilet,p?.toilet_count,p?.baths,p?.bath,p?.details?.bathrooms,p?.rooms?.bathrooms];
    for (const v of wcAliases) { const n = toPosInt(v); if (n) { bathrooms = n; break; } }
  }
  if (!bedrooms) {
    const n = toPosInt(p?.rooms?.bedrooms ?? p?.details?.bedrooms);
    if (n) bedrooms = n;
  }

  const hay = deburrLower([p?.title,p?.description,p?.summary].filter(Boolean).join(" "));
  if (!bedrooms) { const m = hay.match(/(\d+)\s*(pn|phong\s*ngu|\bn\b)/i); if (m) bedrooms = Number(m[1]); }
  if (!bathrooms) { const m = hay.match(/(\d+)\s*(wc|ve\s*sinh|vs)\b/i); if (m) bathrooms = Number(m[1]); }
  if (!bathrooms) { const m2 = hay.match(/(\d+)\s*(phong\s*tam|phòng\s*tắm|toilet|rest\s*room|nha\s*tam)\b/i); if (m2) bathrooms = Number(m2[1]); }
  return { bedrooms, bathrooms };
}

/* ===== share utils ===== */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
function openFacebookShare(shareUrl: string) {
  window.open(
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    "_blank",
    "noopener"
  );
}
function isLocalOrPrivate(urlStr: string) {
  try {
    const u = new URL(urlStr);
    const h = u.hostname;
    if (h === "localhost" || h === "127.0.0.1" || h.endsWith(".local")) return true;
    if (/^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
  } catch {}
  return false;
}
function isMobileUA() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /android|iphone|ipad|ipod|mobile/i.test(ua);
}
function safeNavigate(url: string) {
  try {
    // ưu tiên chuyển hướng cùng tab
    (window.location as any).href = url;
  } catch {}
  // nếu vẫn không rời trang (bị block), fallback mở tab mới
  setTimeout(() => {
    try {
      if (document.visibilityState === "visible") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch {}
  }, 500);
}
/** ===== Zalo share (đa nền tảng) ===== */
function openZaloShareSmart(title: string, urlForZalo: string, rawUrlForCopy?: string) {
  const isMobile = isMobileUA();
  const local = isLocalOrPrivate(urlForZalo) || (rawUrlForCopy ? isLocalOrPrivate(rawUrlForCopy) : false);

  if (isMobile && !local) {
    const zaloShare = `https://zalo.me/share?url=${encodeURIComponent(urlForZalo)}&title=${encodeURIComponent(
      title || "EmyLand"
    )}`;
    window.location.assign(zaloShare);
    return;
  }
  if (isMobile && local && (navigator as any)?.share) {
    (navigator as any).share({ title: title || "EmyLand", url: rawUrlForCopy || urlForZalo }).catch(() => {});
    return;
  }
  copyText(rawUrlForCopy || urlForZalo);
  const contactsUrls = [
    "https://chat.zalo.me/?login=true#/contacts", // ép login nếu chưa đăng nhập
    "https://chat.zalo.me/#/contacts",
    "https://chat.zalo.me/?page=contacts",
    "https://chat.zalo.me/#contacts",
    "https://chat.zalo.me/?contacts=1",
    "https://chat.zalo.me/",
  ];
  // dùng safeNavigate: cùng tab nếu được, nếu bị chặn sẽ tự mở tab mới
  safeNavigate(contactsUrls[0]);

  setTimeout(() => {
    try {
      alert("Đã chép link. Chọn người nhận trong Danh bạ, dán (Ctrl+V) rồi Enter để gửi.");
    } catch {}
  }, 600);
}

/* ++ thêm: Portal popover để không bị cắt */
function isMobileScreen() {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 480;
}
function SharePopover({
  anchorRef,
  onClose,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [style, setStyle] = useState<{ top: number; left: number; width: number; mobile: boolean }>();
  useEffect(() => {
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const mobile = isMobileScreen();
      if (mobile) {
        setStyle({ top: vh - 190, left: 8, width: vw - 16, mobile: true });
      } else {
        const PANEL_W = 288;
        const left = Math.min(Math.max(rect.right - PANEL_W, 8), vw - PANEL_W - 8);
        const top = Math.min(rect.bottom + 8, vh - 170);
        setStyle({ top, left, width: PANEL_W, mobile: false });
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef]);

  if (!style) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[998] bg-transparent emy-share-overlay" onClick={onClose} />
      {style.mobile ? (
        <div className="fixed z-[999] left-2 right-2 bottom-2 rounded-2xl border bg-white p-4 shadow-2xl emy-share-portal">
          {children}
        </div>
      ) : (
        <div
          className="fixed z-[999] rounded-xl border bg-white p-3 shadow-xl emy-share-portal"
          style={{ top: style.top, left: style.left, width: style.width }}
        >
          {children}
        </div>
      )}
    </>,
    document.body
  );
}

/* ============ Component ============ */
export default function PropertyCard({ property }: PropertyCardProps) {
  if (!property) return null;
  const p = property;

  const id = p.id ?? "";
  const title = p.title ?? "";
  const price = p.price;
  const rent_per_month = p.rent_per_month;
  const price_per_m2 = p.price_per_m2;
  const area = p.area;
  const images = p.images;
  const rating = p.rating ?? 4.8;
  const listingType = p.listingType;
  const isHot = p.isHot;
  const createdAt = p.createdAt;

  const typeCode = getTypeCode(p);
  const typeLabel = (typeCode ? TYPE_MAP[typeCode] : undefined)?.label ?? "Nhà đất";
  const finalListingType = listingType ?? getListingType(p);

  const img = firstImg(images);
  const wardText = p.ward ?? p.location?.ward;
  const provinceText = p.province ?? p.location?.province;
  const address = addressOf(wardText, provinceText, p.location);

  const priceText = formatPrice(finalListingType, price, rent_per_month);
  const priceM2Text = formatPricePerM2(finalListingType, area, price_per_m2, price);
  const finalStatus = getVerificationStatus(p);
  const postedText = createdAt ? renderPosted(createdAt) : "";

  const shortDesc = getShortDescription(p);
  const { bedrooms, bathrooms } = inferRooms(p);
  const verifiedShort = verifiedDateLabel(p);

  /* ====== Chia sẻ tin ====== */
  const [shareOpen, setShareOpen] = useState(false);
  const shareWrapRef = useRef<HTMLDivElement>(null);
  /* ++ thêm: ref cho nút để canh Portal */
  const shareBtnRef = useRef<HTMLButtonElement>(null);
  /* ++ cờ bật Portal (giữ popover cũ để “không xoá dòng nào”) */
  const USE_PORTAL_SHARE = true;

  const PUBLIC_SHARE_ORIGIN =
    (import.meta as any)?.env?.VITE_PUBLIC_SHARE_ORIGIN || undefined;

  const shareUrl = useMemo(() => {
    const path = id ? `/property/${id}` : "/";
    try {
      const currentOrigin = window.location.origin;
      const effectiveOrigin =
        isLocalOrPrivate(currentOrigin) && PUBLIC_SHARE_ORIGIN
          ? PUBLIC_SHARE_ORIGIN
          : currentOrigin;
      return new URL(path, effectiveOrigin).toString();
    } catch {
      return path;
    }
  }, [id, PUBLIC_SHARE_ORIGIN]);

  // Link KHÔNG preview cho Zalo: /api/go?t=<shareUrl>
  const zaloNoPreviewUrl = useMemo(() => {
    try {
      const origin = new URL(shareUrl).origin;
      if (isLocalOrPrivate(origin)) return shareUrl;
      const u = new URL("/api/go", origin);
      u.searchParams.set("t", shareUrl);
      return u.toString();
    } catch {
      return shareUrl;
    }
  }, [shareUrl]);

  // === Actions
  const shareFacebook = () => {
    openFacebookShare(shareUrl);
    setShareOpen(false);
  };
  const shareZalo = () => {
    openZaloShareSmart(title || "EmyLand", zaloNoPreviewUrl, shareUrl);
    setShareOpen(false);
  };

  // đóng popover khi click ra ngoài / bấm Esc
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      // nếu click trong portal thì bỏ qua (không đóng ngay)
      if (target && (target.closest(".emy-share-portal") || target.closest(".emy-share-overlay"))) {
        return;
      }
      if (!shareWrapRef.current) return;
      if (!shareWrapRef.current.contains(target as Node)) setShareOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShareOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <Card className="group overflow-hidden border shadow-sm bg-white rounded-2xl hover:shadow-lg transition">
      {/* Ảnh */}
      <div className="relative aspect-video overflow-hidden bg-gray-100">
        <img
          src={img}
          alt={title}
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
          }}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />

        {/* Chips trái */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-2">
          {finalListingType && (
            <Badge className="bg-white/90 text-red-600 font-semibold px-2.5 py-1 border">
              {finalListingType === "sell" ? "Bán" : "Cho thuê"}
            </Badge>
          )}
          <Badge className="bg-white/90 text-red-600 font-semibold px-2.5 py-1 border">
            {typeLabel}
          </Badge>
          {isHot && (
            <Badge className="bg-red-500 text-white font-semibold px-2.5 py-1">
              Nổi bật
            </Badge>
          )}
        </div>

        {/* Logo */}
        <div className="absolute top-2 right-2">
          <img
            src={BRAND_BADGE_URL}
            alt="EmyLand"
            className="h-7 w-7 rounded-full bg-white/95 ring-2 ring-white shadow-md"
            loading="lazy"
          />
        </div>

        {/* Dưới ảnh */}
        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex text-white text-sm font-bold px-3 py-1 rounded-full bg-gradient-to-r from-green-500 to-green-600 shadow">
              {priceText}
            </span>
            {priceM2Text && (
              <span className="inline-flex text-white text-xs font-semibold px-3 py-0.5 rounded-full bg-green-600/90 shadow-sm">
                {priceM2Text}
              </span>
            )}
          </div>

          {(finalStatus === "verified" || finalStatus === "pending") && (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border shadow-sm ${
                finalStatus === "verified"
                  ? "text-white bg-green-500/95 border-green-600"
                  : "text-white bg-yellow-400/95 border-yellow-500"
              }`}
            >
              {finalStatus === "verified" ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : (
                <Hourglass className="w-3.5 h-3.5" />
              )}
              {finalStatus === "verified"
                ? `Đã xác nhận chính chủ${verifiedShort ? " " + verifiedShort : ""}`
                : "Đang xác nhận chính chủ"}
            </span>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Tiêu đề (click = xem chi tiết) + ⭐ */}
        <div className="flex items-start justify-between gap-3">
          <Link
            to={id ? `/property/${id}` : "#"}
            aria-label={title ? `Xem chi tiết: ${title}` : "Xem chi tiết"}
            className="group/link -m-1 p-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            title="Xem chi tiết"
          >
            <h3 className="cursor-pointer text-base sm:text-lg font-semibold text-gray-900 line-clamp-2 transition-all duration-200 group-hover:text-indigo-600 group-hover:drop-shadow-sm group-hover/link:text-indigo-600 hover:underline decoration-2 underline-offset-2">
              {title}
            </h3>
          </Link>

          {(rating ?? 0) > 0 && (
            <div className="shrink-0 inline-flex items-center gap-1 text-yellow-500">
              <Star className="h-4 w-4 fill-yellow-500" />
              <span className="text-sm font-semibold text-gray-800">
                {Number(rating ?? 0).toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Địa chỉ */}
        <div className="flex items-center text-sm text-gray-600 gap-1.5">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="truncate">{address}</span>
        </div>

        {/* Thông số + Chia sẻ */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 font-medium">
            {area ?? "--"} m²
            {typeof bedrooms === "number" ? ` • ${bedrooms}N` : ""}
            {typeof bathrooms === "number" ? ` • ${bathrooms}WC` : ""}
            {postedText ? (
              <span className="text-gray-500 font-normal"> • {postedText}</span>
            ) : null}
          </div>

          {/* Popover: Zalo / FaceBook (gọn) */}
          <div className="relative" ref={shareWrapRef}>
            <button
              ref={shareBtnRef}
              type="button"
              onClick={() => setShareOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              title="Chia sẻ tin"
            >
              <Share2 className="h-3.5 w-3.5" />
              Chia sẻ
            </button>

            {/* ++ Popover cũ được giữ nguyên nhưng ẩn khi dùng Portal để đảm bảo 'không xoá dòng nào' */}
            {shareOpen && (
              <div className={`absolute right-0 z-40 mt-2 w-72 rounded-xl border bg-white p-3 shadow-xl ${USE_PORTAL_SHARE ? "hidden" : ""}`}>
                <div className="mb-2 text-sm font-medium text-gray-700">
                  Chia sẻ tin
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={shareZalo}
                    className="inline-flex justify-center items-center rounded-lg px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow"
                    title="Nhấp và dán vào cuộc trò chuyện Zalo để chia sẻ tin đăng"
                  >
                    Zalo
                  </button>

                  <button
                    type="button"
                    onClick={shareFacebook}
                    className="inline-flex justify-center items-center rounded-lg px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow"
                    title="FaceBook"
                  >
                    FaceBook
                  </button>
                </div>
              </div>
            )}

            {/* ++ Popover mới bằng Portal: không bị cắt, auto canh vị trí */}
            {shareOpen && USE_PORTAL_SHARE && (
              <SharePopover anchorRef={shareBtnRef as React.RefObject<HTMLElement>} onClose={() => setShareOpen(false)}>
                <div className="mb-2 text-sm font-medium text-gray-700">Chia sẻ tin</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={shareZalo}
                    className="inline-flex justify-center items-center rounded-lg px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow"
                    title="Nhấp và dán vào cuộc trò chuyện Zalo để chia sẻ tin đăng"
                  >
                    Zalo
                  </button>
                  <button
                    type="button"
                    onClick={shareFacebook}
                    className="inline-flex justify-center items-center rounded-lg px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow"
                    title="FaceBook"
                  >
                    FaceBook
                  </button>
                </div>
              </SharePopover>
            )}
          </div>
        </div>

        {/* Mô tả rút gọn */}
        {shortDesc && (
          <p className="text-[13px] text-gray-400 italic opacity-90 emy-desc-clamp select-none">
            {shortDesc}
          </p>
        )}
      </CardContent>

      <style>{`
        .emy-desc-clamp{
          display:-webkit-box;
          -webkit-box-orient:vertical;
          overflow:hidden;
          -webkit-line-clamp:2;
          line-clamp:2;
        }
        @media (min-width:1024px){
          .emy-desc-clamp{ -webkit-line-clamp:3; line-clamp:3; }
        }
      `}</style>
    </Card>
  );
}
