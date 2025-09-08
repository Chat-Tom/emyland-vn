
cat > src/pages/PostProperty.tsx <<'TSX'
// src/pages/PostProperty.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

// 🔧 storage ở GỐC dự án (ngoài /src) → đi ra 2 cấp
import { StorageManager } from "../../utils/storage";
import { appendLog, getActorEmail } from "../../utils/log";

// 🔧 data nằm TRONG /src → dùng alias "@/..." (alias @ trỏ tới src)
import { PROPERTY_TYPES } from "@/data/property-types";
import { provinces, wardsByProvince } from "@/data/vietnam-locations";

// lib/supabase cũng ở /src
import { supabase } from "@/lib/supabase";

type ListingType = "sell" | "rent";

const BIG6_ORDER = [
  "Thành phố Hồ Chí Minh",
  "Thành phố Hà Nội",
  "Thành phố Đà Nẵng",
  "Thành phố Hải Phòng",
  "Thành phố Cần Thơ",
  "Thành phố Huế",
];

const AI_TMP_BUCKET =
  (import.meta as any)?.env?.VITE_SUPABASE_BUCKET_PUBLIC || "public";

const MAX_IMAGE_MB = 8;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

/* ===== Helpers ===== */
function isValidUrl(u: string) {
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
function wardWeight(name: string) {
  if (name.startsWith("Phường")) return 0;
  if (name.startsWith("Xã")) return 1;
  return 2;
}
function dataURLtoBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const isBase64 = /;base64$/i.test(header);
  const mime = (header.match(/^data:(.*?)(;|$)/i)?.[1] || "image/jpeg").trim();
  if (isBase64) {
    const binStr = atob(data);
    const len = binStr.length;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) u8[i] = binStr.charCodeAt(i);
    return new Blob([u8], { type: mime || "image/jpeg" });
  }
  const u8 = new Uint8Array(unescape(data).split("").map((c) => c.charCodeAt(0)));
  return new Blob([u8], { type: mime || "image/jpeg" });
}

/* ===== Phone helpers (giống Login/Đăng ký) ===== */
function sanitizePhone(v: string) {
  return v.replace(/\D/g, "");
}
function normalizeVNPhone(input: string) {
  const digits = sanitizePhone(input);
  let normalized = digits.startsWith("84") ? "0" + digits.slice(2) : digits;
  if (normalized.length > 0 && normalized[0] !== "0") normalized = "0" + normalized;
  return normalized.slice(0, 10);
}
function isValidVNPhone(v: string) {
  return /^(03|05|07|08|09)\d{8}$/.test(sanitizePhone(v));
}

/* ===== (NEW) SEO/PWA head helpers (idempotent) ===== */
function ensureMeta(attr: Partial<HTMLMetaElement>, id?: string) {
  const head = document.head;
  let el: HTMLMetaElement | null = id ? (head.querySelector(`#${id}`) as HTMLMetaElement | null) : null;
  if (!el) {
    const selector =
      (attr as any).name ? `meta[name="${(attr as any).name}"]` :
      (attr as any).property ? `meta[property="${(attr as any).property}"]` : "";
    el = selector ? (head.querySelector(selector) as HTMLMetaElement | null) : null;
  }
  if (!el) {
    el = document.createElement("meta");
    if (id) el.id = id;
    head.appendChild(el);
  }
  Object.entries(attr).forEach(([k, v]) => {
    if (v !== undefined && v !== null) el!.setAttribute(k, String(v));
  });
  return el!;
}
function ensureLink(rel: string, href: string, id?: string) {
  const head = document.head;
  let el: HTMLLinkElement | null = id ? (head.querySelector(`#${id}`) as HTMLLinkElement | null) : null;
  if (!el) el = head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    if (id) el.id = id;
    head.appendChild(el);
  }
  el.href = href;
  return el;
}
function ensureJSONLD(id: string, data: any) {
  const head = document.head;
  let el = head.querySelector(`#${id}`) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
  return el;
}
/** (NEW) Mở tab an toàn: chặn access window.opener */
function openInNewTabSafe(url: string) {
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) w.opener = null;
  } catch {
    const w = window.open();
    if (w) {
      w.opener = null;
      w.location.href = url;
    }
  }
}

/* ===== Read helpers ===== */
function getAllLocalProperties(): any[] {
  try {
    const raw = localStorage.getItem("emyland_properties") || "[]";
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}
function getPropertyByIdLocal(id: string): any | null {
  const all = getAllLocalProperties();
  return all.find((p) => String(p?.id) === String(id)) || null;
}
function getLegalImagesByIdLocal(id: string): string[] {
  try {
    if (typeof (StorageManager as any).getLegalImages === "function") {
      const arr = (StorageManager as any).getLegalImages(id);
      if (Array.isArray(arr)) return arr.filter(Boolean);
    }
  } catch {}
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || "";
      if (!k) continue;
      if (k.includes("legal") && k.includes(id)) {
        const v = localStorage.getItem(k);
        try {
          const arr = JSON.parse(v || "[]");
          if (Array.isArray(arr)) out.push(...arr.filter(Boolean));
        } catch {}
      }
    }
  } catch {}
  return out;
}

/* ===== Province name → id ===== */
function provinceIdFromName(name?: string): string {
  if (!name) return "";
  const exact = provinces.find((p) => p.provinceName === name)?.provinceId;
  if (exact) return exact;
  const loose = provinces.find(
    (p) => p.provinceName.toLowerCase().includes(String(name).toLowerCase())
  )?.provinceId;
  return loose || "";
}

/* ===== Form state ===== */
type FormState = {
  provinceId: string;
  ward: string;
  address: string;
  mapUrl: string;

  listingType: ListingType;

  propertyType: string;
  area: string;
  priceTy: string;
  rentMil: string;
  title: string;
  description: string;

  bedrooms: string;
  bathrooms: string;

  images: string[];
  legalImages: string[];

  contactName: string;
  contactPhone: string;

  agreeOwnerPhone: boolean;
  agreeLegalTruth: boolean;
};

const initialForm: FormState = {
  provinceId: "",
  ward: "",
  address: "",
  mapUrl: "",

  listingType: "sell",

  propertyType: "",
  area: "",
  priceTy: "",
  rentMil: "",
  title: "",
  description: "",

  bedrooms: "",
  bathrooms: "",

  images: [],
  legalImages: [],
  contactName: "",
  contactPhone: "",

  agreeOwnerPhone: true,
  agreeLegalTruth: true,
};

const PostProperty: React.FC = () => {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const [form, setForm] = useState<FormState>(initialForm);
  const [aiBusy, setAiBusy] = useState(false);

  // ===== trạng thái chỉnh sửa
  const editId = useMemo(
    () => sp.get("id") || sp.get("edit") || sp.get("pid"),
    [sp]
  );
  const isEditMode = !!editId;
  const [originalCreatedAt, setOriginalCreatedAt] = useState<string | null>(null);

  // ===== Hydrate user
  useEffect(() => {
    let cur = StorageManager.getCurrentUser?.();
    if (!cur || !cur.isLoggedIn) {
      try {
        const sessionRaw = localStorage.getItem("emyland_active_session");
        if (sessionRaw) {
          const session = JSON.parse(sessionRaw);
          if (session?.phone) {
            const u =
              StorageManager.getUserByPhone?.(sanitizePhone(session.phone)) ||
              StorageManager.getUserByEmail?.(session.email || "");
            if (u) {
              StorageManager.saveUser?.({ ...u, isLoggedIn: true });
              cur = { ...u, isLoggedIn: true };
            }
          }
        }
      } catch {}
    }
    if (!cur || !cur.isLoggedIn) {
      navigate(`/login?next=/post-property${editId ? `?id=${encodeURIComponent(editId)}` : ""}`);
      return;
    }
    setForm((f) => ({
      ...f,
      contactName: cur.fullName || "",
      contactPhone: cur.phone || "",
    }));
    if (isEditMode && editId) {
      loadPropertyForEdit(editId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, isEditMode, editId]);

  // ====== (NEW) SEO/PWA dynamic head ======
  useEffect(() => {
    const site = `Nền tảng "Nhà đất chính chủ"`;
    const page = isEditMode ? "Sửa tin bất động sản" : "Đăng tin bất động sản";
    const provinceName =
      sortedProvinces.find((p) => p.provinceId === form.provinceId)?.provinceName || "Việt Nam";
    const title =
      form.title?.trim()
        ? `${page}: ${form.title.trim()} | ${site}`
        : `${page} | ${site}`;
    const desc =
      (form.description && form.description.trim().slice(0, 150)) ||
      `Đăng tin nhà đất chính chủ tại ${provinceName} trên EmyLand. Xác minh minh bạch, tiếp cận đúng khách hàng.`;

    document.title = title;

    ensureMeta({ name: "theme-color", content: "#d70000" });

    const url = window.location.origin + window.location.pathname + window.location.search;
    ensureLink("canonical", url, "pp-canonical");
    ensureMeta({ property: "og:url", content: url }, "pp-og-url");

    ensureMeta({ name: "description", content: desc }, "pp-desc");
    ensureMeta({ property: "og:type", content: "website" }, "pp-og-type");
    ensureMeta({ property: "og:site_name", content: "EmyLand" }, "pp-og-site");
    ensureMeta({ property: "og:title", content: title }, "pp-og-title");
    ensureMeta({ property: "og:description", content: desc }, "pp-og-desc");
    ensureMeta({ name: "twitter:card", content: "summary" }, "pp-tw-card");
    ensureMeta({ name: "twitter:title", content: title }, "pp-tw-title");
    ensureMeta({ name: "twitter:description", content: desc }, "pp-tw-desc");
    ensureMeta({ name: "apple-mobile-web-app-title", content: site }, "pp-apple-title");

    ensureJSONLD("pp-jsonld", {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": site,
      "url": window.location.origin + "/",
      "potentialAction": {
        "@type": "SearchAction",
        "target": window.location.origin + "/?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    });
  }, [
    isEditMode,
    form.title,
    form.description,
    form.provinceId,
    form.listingType,
  ]);

  // ====== nạp dữ liệu tin để sửa (bao gồm ảnh pháp lý) ======
  const loadPropertyForEdit = (id: string) => {
    const p =
      (typeof (StorageManager as any).getPropertyById === "function"
        ? (StorageManager as any).getPropertyById(id)
        : null) || getPropertyByIdLocal(id);

    if (!p) return;

    const lt: ListingType =
      (p?.listingType as ListingType) ??
      (typeof p?.rent_per_month === "number" ? "rent" : "sell");

    const area = (p?.area ?? p?.size ?? "") as any;
    const provinceName =
      p?.location?.province || p?.province || p?.provinceName || "";
    const provId = provinceIdFromName(provinceName);

    const bedrooms =
      p?.bedrooms ?? p?.bedroom_count ?? p?.bed ?? p?.rooms?.bedrooms ?? "";
    const bathrooms =
      p?.bathrooms ?? p?.bathroom_count ?? p?.wc ?? p?.rooms?.bathrooms ?? "";

    const images = (p?.images || p?.photos || p?.gallery || []) as string[];
    const legalImages =
      getLegalImagesByIdLocal(id) ||
      (p?.legalImages || p?.legal_images || p?.legal_docs || p?.attachments || []);

    const priceTy =
      lt === "sell" && Number(p?.price)
        ? String((Number(p.price) / 1_000_000_000).toFixed(2)).replace(/\.00$/, "")
        : "";
    const rentMil =
      lt === "rent" && Number(p?.rent_per_month)
        ? String(Math.round(Number(p.rent_per_month) / 1_000_000))
        : "";

    setOriginalCreatedAt(p?.createdAt || p?.created_at || null);

    setForm((f) => ({
      ...f,
      provinceId: provId,
      ward: p?.location?.ward || p?.ward || "",
      address: p?.location?.address || p?.address || "",
      mapUrl: p?.mapUrl || p?.location?.map_url || "",

      listingType: lt,

      propertyType: p?.propertyType || p?.property_type || "",
      area: area ? String(area) : "",
      priceTy,
      rentMil,
      title: p?.title || "",
      description: p?.description || p?.summary || "",

      bedrooms: bedrooms ? String(bedrooms) : "",
      bathrooms: bathrooms ? String(bathrooms) : "",

      images: Array.isArray(images) ? images : [],
      legalImages: Array.isArray(legalImages) ? legalImages : [],

      contactName: p?.contactInfo?.name || p?.ownerName || f.contactName,
      contactPhone: p?.contactInfo?.phone || p?.ownerPhone || f.contactPhone,

      agreeOwnerPhone: true,
      agreeLegalTruth: true,
    }));
  };

  const sortedProvinces = useMemo(() => {
    return provinces
      .filter(
        (p) =>
          !/Tỉnh\s*\/\s*Thành\s*Phố/i.test(p.provinceName) &&
          p.provinceName.trim() !== ""
      )
      .slice()
      .sort((a, b) => {
        const ia = BIG6_ORDER.indexOf(a.provinceName);
        const ib = BIG6_ORDER.indexOf(b.provinceName);
        const aBig = ia !== -1;
        const bBig = ib !== -1;
        if (aBig || bBig) {
          if (aBig && !bBig) return -1;
          if (!aBig && bBig) return 1;
          return ia - ib;
        }
        return a.provinceName.localeCompare(b.provinceName, "vi");
      });
  }, []);

  const wardOptions = useMemo(() => {
    if (!form.provinceId) return [];
    const arr = wardsByProvince[form.provinceId] || [];
    return arr.slice().sort((a, b) => {
      const wa = wardWeight(a);
      const wb = wardWeight(b);
      if (wa !== wb) return wa - wb;
      return a.localeCompare(b, "vi");
    });
  }, [form.provinceId]);

  const sellPriceVND = useMemo(() => {
    if (form.listingType !== "sell") return 0;
    const ty = Number(String(form.priceTy).replace(",", "."));
    if (!isFinite(ty) || ty <= 0) return 0;
    return Math.round(ty * 1_000_000_000);
  }, [form.listingType, form.priceTy]);

  const rentPerMonthVND = useMemo(() => {
    if (form.listingType !== "rent") return 0;
    const mil = Number(String(form.rentMil).replace(",", "."));
    if (!isFinite(mil) || mil <= 0) return 0;
    return Math.round(mil * 1_000_000);
  }, [form.listingType, form.rentMil]);

  const pricePerM2Mil = useMemo(() => {
    if (form.listingType !== "sell") return 0;
    const area = Number(form.area);
    if (!area || !sellPriceVND) return 0;
    return +(sellPriceVND / 1_000_000 / area).toFixed(2);
  }, [sellPriceVND, form.area, form.listingType]);

  const onChange =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
    };
  const onToggle =
    (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.checked }));
    };

  // chuyển File[] -> dataURL[]
  const filesToDataUrls = (files: File[]) =>
    Promise.all(
      Array.from(files).map(
        (f) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = reject;
            reader.readAsDataURL(f);
          })
      )
    );

  const onSelectImages =
    (field: "images" | "legalImages", limit: number) =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const all = Array.from(files);
      const accepted = all.filter((f) => f.size <= MAX_IMAGE_BYTES);
      const rejectedCount = all.length - accepted.length;

      if (rejectedCount > 0) {
        alert(`Đã bỏ qua ${rejectedCount} ảnh vượt quá ${MAX_IMAGE_MB}MB/ảnh.`);
      }
      if (accepted.length === 0) {
        e.target.value = "";
        return;
      }

      const urls = await filesToDataUrls(accepted);
      setForm((f) => {
        const merged = [...f[field], ...urls].slice(0, limit);
        return { ...f, [field]: merged };
      });
      e.target.value = "";
    };

  const removeImage =
    (field: "images" | "legalImages", idx: number) => () => {
      setForm((f) => {
        const clone = f[field].slice();
        clone.splice(idx, 1);
        return { ...f, [field]: clone };
      });
    };

  /* ====== LIVE ERROR cho số điện thoại + chặn submit khi sai ====== */
  const phoneError = useMemo(() => {
    const v = form.contactPhone.trim();
    if (!v) return "";
    const normalized = normalizeVNPhone(v);
    return isValidVNPhone(normalized)
      ? ""
      : "Số điện thoại Việt Nam 10 số (đầu 03/05/07/08/09)";
  }, [form.contactPhone]);

  const canSubmit = useMemo(() => {
    return !aiBusy && form.contactPhone.trim() !== "" && !phoneError;
  }, [aiBusy, form.contactPhone, phoneError]);

  const validate = (): string | null => {
    if (!form.provinceId) return "Vui lòng chọn Tỉnh/Thành.";
    if (!form.ward) return "Vui lòng chọn Phường/Xã.";
    if (!form.address.trim()) return "Vui lòng nhập địa chỉ theo sổ đỏ/HĐMB.";
    if (!form.propertyType) return "Vui lòng chọn Loại nhà đất.";
    if (!Number(form.area)) return "Vui lòng nhập diện tích hợp lệ.";

    if (form.listingType === "sell" && !sellPriceVND)
      return "Vui lòng nhập giá bán (tính theo TỶ VND).";
    if (form.listingType === "rent" && !rentPerMonthVND)
      return "Vui lòng nhập giá thuê (tính theo TRIỆU/tháng).";

    if (!form.title.trim()) return "Vui lòng nhập Tiêu đề.";
    if (!form.description.trim()) return "Vui lòng nhập Mô tả.";
    if (!form.contactPhone.trim())
      return "Vui lòng nhập Số điện thoại liên hệ. Bạn có thể thay số khác với số gợi ý.";
    if (!isValidVNPhone(normalizeVNPhone(form.contactPhone)))
      return "Số điện thoại liên hệ không hợp lệ (VN 10 số, đầu 03/05/07/08/09).";
    if (form.images.length === 0) return "Vui lòng chọn ít nhất 1 ảnh bất động sản.";
    if (form.legalImages.length === 0)
      return "Vui lòng tải ảnh pháp lý (sổ đỏ/HĐMB) — chụp phần có tên chính chủ.";
    if (!form.agreeOwnerPhone || !form.agreeLegalTruth)
      return "Bạn cần đồng ý hai cam kết để tiếp tục.";
    return null;
  };

  const buildPropertyPayload = (id: string, nowISO: string, provinceName: string, keepCreatedAt?: string | null) => {
    const property: any = {
      id,
      title: form.title.trim(),
      description: form.description.trim(),
      area: Number(form.area),
      propertyType: form.propertyType,
      location: {
        province: provinceName,
        district: "",
        ward: form.ward,
        address: form.address.trim(),
      },
      mapUrl: form.mapUrl || undefined,
      contactInfo: {
        name: form.contactName.trim(),
        phone: form.contactPhone.trim(),
        ownerVerified: false,
        ownerVerifiedAt: undefined,
        owner_verified_at: undefined,
      },
      verificationStatus: "pending",
      verifiedAt: undefined,
      verified_at: undefined,

      images: form.images,
      listingType: form.listingType,

      ward: form.ward,
      province: provinceName,
      address: form.address.trim(),

      is_verified: false,
      verified: false,
      verification_status: "pending",

      userEmail: StorageManager.getCurrentUser?.()?.email || undefined,
      user_email: StorageManager.getCurrentUser?.()?.email || undefined,

      property_type: form.propertyType,
      listing_type: form.listingType,

      updatedAt: nowISO,
      updated_at: nowISO,
      createdAt: keepCreatedAt || nowISO,
      created_at: keepCreatedAt || nowISO,
    };

    if (form.listingType === "sell") {
      property.price = sellPriceVND;
      property.price_per_m2 =
        property.area > 0 && sellPriceVND ? Math.round(sellPriceVND / property.area) : undefined;
    } else {
      property.rent_per_month = rentPerMonthVND;
    }

    const bd = Number(form.bedrooms);
    const bt = Number(form.bathrooms);
    if (isFinite(bd) && bd > 0) {
      property.bedrooms = bd;
      property.bedroom_count = bd;
      property.bed = bd;
    }
    if (isFinite(bt) && bt > 0) {
      property.bathrooms = bt;
      property.bathroom_count = bt;
      property.bath = bt;
      property.wc = bt;
      property.WC = bt;
    }

    return property;
  };

  const onSubmit = async () => {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }
    const current = StorageManager.getCurrentUser?.();
    if (!current || !current.isLoggedIn) {
      alert("Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.");
      navigate("/login");
      return;
    }

    const now = new Date().toISOString();
    const provinceName =
      sortedProvinces.find((p) => p.provinceId === form.provinceId)?.provinceName || "";

    if (isEditMode && editId) {
      // ====== UPDATE
      const payload = buildPropertyPayload(editId, now, provinceName, originalCreatedAt);
      // localStorage update (không thay id/createdAt)
      const all = getAllLocalProperties();
      const idx = all.findIndex((p) => String(p?.id) === String(editId));
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...payload, id: editId, createdAt: originalCreatedAt || all[idx]?.createdAt, created_at: originalCreatedAt || all[idx]?.created_at };
        localStorage.setItem("emyland_properties", JSON.stringify(all));
      } else {
        all.unshift(payload);
        localStorage.setItem("emyland_properties", JSON.stringify(all));
      }
      try { StorageManager.saveLegalImages?.(editId, form.legalImages); } catch {}
      try {
        const { error } = await supabase.from("properties").upsert(payload, { onConflict: "id" });
        if (error) console.error("Supabase upsert error:", error);
      } catch (e) {
        console.error("Supabase upsert exception:", e);
      }
      try {
        window.dispatchEvent(new CustomEvent("emyland:properties-changed"));
        localStorage.setItem("emyland_properties_updated", String(Date.now()));
      } catch {}
      alert("Đã lưu thay đổi tin đăng.");
    try { appendLog({ actorEmail: getActorEmail(StorageManager), target: "property", targetId: editId, action: "update", summary: "Cập nhật tin " + (payload?.title || editId) }); } catch {}
      navigate("/dashboard");
      return;
    }

    // ====== CREATE
    const id = StorageManager.generateId?.() || String(Date.now());
    const payload = buildPropertyPayload(id, now, provinceName);

    // Lưu LocalStorage
    try {
      StorageManager.saveProperty?.(payload);
    } catch {
      const all = getAllLocalProperties();
      all.unshift(payload);
      localStorage.setItem("emyland_properties", JSON.stringify(all));
    }
    try { StorageManager.saveLegalImages?.(id, form.legalImages); } catch {}

    // Đẩy lên Supabase (không chặn luồng nếu lỗi)
    try {
      const { error } = await supabase.from("properties").insert([payload]);
      if (error) console.error("Supabase insert error:", error);
    } catch (e) {
      console.error("Supabase insert exception:", e);
    }

    try {
      window.dispatchEvent(new CustomEvent("emyland:properties-changed"));
      localStorage.setItem("emyland_properties_updated", String(Date.now()));
    } catch {}

    alert("Đăng tin thành công! Tin của bạn đang ở trạng thái 'Đang xác nhận chính chủ'.");
    try { appendLog({ actorEmail: getActorEmail(StorageManager), target: "property", targetId: id, action: "create", summary: "Đăng tin mới " + (payload?.title || id) }); } catch {}
    navigate("/dashboard");
  };

  const openCopilotForDescription = () => {
    const title = form.title || "Tiêu đề";
    const area = form.area || "0";
    const typeLabel =
      PROPERTY_TYPES.find((t) => t.value === form.propertyType)?.label || "Nhà đất";
    const provinceName =
      sortedProvinces.find((p) => p.provinceId === form.provinceId)?.provinceName || "Tỉnh/Thành";
    const listingText = form.listingType === "rent" ? "cho thuê" : "bán";
    const nText =
      (form.bedrooms ? `${form.bedrooms}N` : "") +
      (form.bathrooms ? `${form.bedrooms ? " • " : ""}${form.bathrooms}WC` : "");
    const seed = `
Bạn là chuyên gia viết bài đăng bất động sản.
Hãy viết giúp tôi một đoạn mô tả ngắn gọn (120–180 từ), súc tích, hấp dẫn, đúng sự thật – không phóng đại, không gây hiểu nhầm.
- Tiêu đề: ${title}
- Loại: ${typeLabel} • ${listingText}
- Diện tích: ${area} m²${nText ? ` • Phòng: ${nText}` : ""}
- Khu vực gần đúng: ${provinceName}
- Yêu cầu: trình bày tự nhiên, có bullet ngắn gọn nếu hợp lý, có lời kêu gọi hành động nhẹ nhàng.
Nếu có thông tin liên hệ, chỉ kết thúc bằng câu mời liên hệ, không chèn số điện thoại.`;
    const url = `https://copilot.microsoft.com/?q=${encodeURIComponent(seed)}`;
    openInNewTabSafe(url);
  };

  const openAiImageEditor = async () => {
    if (!form.images.length) {
      alert("Bạn hãy chọn ít nhất 1 ảnh bất động sản trước đã nhé.");
      return;
    }
    setAiBusy(true);
    const win = window.open("about:blank", "_blank", "noopener,noreferrer");

    try {
      const src = form.images[0];

      if (isValidUrl(src)) {
        const pp = `https://www.photopea.com/#iurl=${encodeURIComponent(src)}`;
        if (win) { win.opener = null; win.location.href = pp; } else openInNewTabSafe(pp);
        return;
      }
      if (src.startsWith("data:") && src.length < 1_600_000) {
        const cfg = { files: [src] };
        const pp = `https://www.photopea.com/#${encodeURIComponent(JSON.stringify(cfg))}`;
        if (win) { win.opener = null; win.location.href = pp; } else openInNewTabSafe(pp);
        return;
      }
      if (src.startsWith("data:")) {
        const blob = dataURLtoBlob(src);
        const key = `ai-prep/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const up = await supabase.storage.from(AI_TMP_BUCKET).upload(key, blob, {
          contentType: blob.type || "image/jpeg",
          upsert: true,
        });
        if (up.error) throw up.error;
        const { data } = supabase.storage.from(AI_TMP_BUCKET).getPublicUrl(key);
        const publicUrl = data.publicUrl;
        const pp = `https://www.photopea.com/#iurl=${encodeURIComponent(publicUrl)}`;
        if (win) { win.opener = null; win.location.href = pp; } else openInNewTabSafe(pp);
        return;
      }
      const fallback = "https://pixlr.com/vn/editor/";
      if (win) { win.opener = null; win.location.href = fallback; } else openInNewTabSafe(fallback);
    } catch (e) {
      if (win) win.close();
      alert("Không thể chuẩn bị ảnh tự động. Mình sẽ mở trình sửa ảnh, bạn hãy dán ảnh thủ công (Ctrl+V) nhé.");
      openInNewTabSafe("https://pixlr.com/vn/editor/");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-extrabold text-center mb-8">
        {isEditMode ? "Sửa tin bất động sản" : "Đăng tin bất động sản"}
      </h1>

      <div className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Vị trí & địa chỉ */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Vị trí & địa chỉ</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tỉnh/Thành */}
            <div>
              <label className="block text-sm font-medium mb-1">Tỉnh/Thành *</label>
              <select
                value={form.provinceId}
                onChange={(e) => setForm((f) => ({ ...f, provinceId: e.target.value, ward: "" }))}
                className="w-full rounded-lg border p-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="address-level1"
              >
                <option value="" disabled hidden>
                  Chọn Tỉnh/Thành
                </option>
                {sortedProvinces.map((p) => (
                  <option key={p.provinceId} value={p.provinceId}>
                    {p.provinceName}
                  </option>
                ))}
              </select>
            </div>

            {/* Phường/Xã */}
            <div>
              <label className="block text-sm font-medium mb-1">Phường/Xã *</label>
              <select
                value={form.ward}
                onChange={onChange("ward")}
                disabled={!form.provinceId}
                className="w-full rounded-lg border p-3 placeholder:text-gray-400 disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="address-level2"
              >
                <option value="" disabled hidden>
                  Chọn Phường/Xã
                </option>
                {wardOptions.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            {/* Địa chỉ theo sổ đỏ/HĐMB */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Địa chỉ theo sổ đỏ/HĐMB *</label>
              <input
                value={form.address}
                onChange={onChange("address")}
                placeholder="VD: Số nhà, đường, khu/ấp (không ghi Xã/Phường)"
                className="w-full rounded-lg border p-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="street-address"
                inputMode="text"
              />
            </div>

            {/* Link Google Maps */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Link vị trí Google Maps (nếu có)</label>
              <div className="flex gap-3">
                <input
                  value={form.mapUrl}
                  onChange={onChange("mapUrl")}
                  placeholder="https://maps.google.com/..."
                  className="flex-1 rounded-lg border p-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="url"
                  inputMode="url"
                />
                <button
                  type="button"
                  disabled={!isValidUrl(form.mapUrl)}
                  onClick={() => openInNewTabSafe(form.mapUrl)}
                  className="px-4 rounded-lg border bg-amber-400 text-black hover:bg-amber-500 disabled:opacity-50 shadow whitespace-nowrap"
                >
                  Mở bản đồ
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Thông tin nhà đất */}
        <section className="space-y-4 mt-8">
          <h2 className="text-xl font-bold">Thông tin nhà đất</h2>

          {/* Hình thức tin */}
          <div>
            <label className="block text-sm font-medium mb-2">Hình thức tin *</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, listingType: "sell" }))}
                className={`px-4 py-2 rounded-lg border shadow-sm transition
                  ${form.listingType === "sell"
                    ? "bg-amber-400 text-black border-amber-400"
                    : "bg-white hover:bg-amber-50"}`}
              >
                Nhà đất bán
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, listingType: "rent" }))}
                className={`px-4 py-2 rounded-lg border shadow-sm transition
                  ${form.listingType === "rent"
                    ? "bg-amber-400 text-black border-amber-400"
                    : "bg-white hover:bg-amber-50"}`}
              >
                Nhà đất cho thuê
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Loại nhà đất */}
            <div>
              <label className="block text-sm font-medium mb-1">Loại nhà đất *</label>
              <select
                value={form.propertyType}
                onChange={onChange("propertyType")}
                className="w-full rounded-lg border p-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="on"
              >
                <option value="" disabled hidden>
                  Chọn loại nhà đất
                </option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Diện tích */}
            <div>
              <label className="block text-sm font-medium mb-1">Diện tích (m²) *</label>
              <input
                type="number"
                min={0}
                step="1"
                value={form.area}
                onChange={onChange("area")}
                placeholder="VD: 56"
                className="w-full rounded-lg border p-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                inputMode="numeric"
                autoComplete="off"
              />
            </div>

            {/* Số phòng */}
            <div>
              <label className="block text-sm font-medium mb-1">Số phòng ngủ (hiển thị “N”)</label>
              <input
                type="number"
                min={0}
                step="1"
                value={form.bedrooms}
                onChange={onChange("bedrooms")}
                placeholder="VD: 3  → hiển thị 3N"
                className="w-full rounded-lg border p-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số phòng vệ sinh (hiển thị “WC”)</label>
              <input
                type="number"
                min={0}
                step="1"
                value={form.bathrooms}
                onChange={onChange("bathrooms")}
                placeholder="VD: 2  → hiển thị 2WC"
                className="w-full rounded-lg border p-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                inputMode="numeric"
                autoComplete="off"
              />
            </div>

            {/* Giá bán / Giá thuê */}
            {form.listingType === "sell" ? (
              <div>
                <label className="block text-sm font-medium mb-1">Giá bán (tỷ VND) *</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.priceTy}
                  onChange={onChange("priceTy")}
                  placeholder="VD: 3.2"
                  className="w-full rounded-lg border p-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  inputMode="decimal"
                  autoComplete="off"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Giá nhập theo <strong>tỷ VND</strong>. • Ước tính:{" "}
                  <strong>{pricePerM2Mil || 0}</strong> triệu/m².
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">Giá thuê (triệu/tháng) *</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={form.rentMil}
                  onChange={onChange("rentMil")}
                  placeholder="VD: 12"
                  className="w-full rounded-lg border p-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  inputMode="decimal"
                  autoComplete="off"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Nhập theo <strong>triệu/tháng</strong>.
                </p>
              </div>
            )}

            {/* Tiêu đề */}
            <div className="relative md:col-span-2">
              <label className="block text-sm font-medium mb-1">Tiêu đề *</label>
              <input
                value={form.title}
                onChange={onChange("title")}
                placeholder="VD: Căn góc, 3N 2WC, mặt đường"
                className="w-full rounded-lg border p-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="on"
                inputMode="text"
              />
            </div>

            {/* Mô tả chi tiết*/}
            <div className="relative md:col-span-2">
              <label className="block text-sm font-medium mb-1">Mô tả chi tiết*</label>
              <textarea
                rows={5}
                value={form.description}
                onChange={onChange("description")}
                placeholder="Mô tả thêm tiện ích xung quanh (nếu cần)...Nhấp AI mô tả cuốn hút người đọc"
                className="w-full rounded-lg border p-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="on"
              />
              <div className="absolute -bottom-3 right-0 translate-y-full mt-2 flex items-center gap-2">
                <em className="text-xs text-gray-500 hidden sm:block">
                  AI giúp bạn mô tả nhà đất súc tích, cuốn hút người đọc…
                </em>
                <button
                  type="button"
                  onClick={openCopilotForDescription}
                  className="px-3 py-2 rounded-lg bg-amber-400 text-black font-semibold shadow hover:bg-amber-500 transition animate-pulse"
                >
                  ✨ AI mô tả
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Hình ảnh & xác minh */}
        <section className="space-y-4 mt-10">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-bold">Hình ảnh</h2>
            <span className="text-xs text-gray-500">
              AI làm mượt ảnh: sáng/nét hơn mà không đổi bản chất ảnh.
            </span>
          </div>

          {/* Ảnh nhà đất */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Ảnh nhà đất (tối đa 10, ≤ 8MB/ảnh)
            </label>
            <div className="flex items-center gap-3">
              <input
                id="images-input"
                type="file"
                accept="image/*"
                multiple
                onChange={onSelectImages("images", 10)}
                className="sr-only"
              />
              <label
                htmlFor="images-input"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-white hover:bg-amber-50 shadow cursor-pointer whitespace-nowrap"
              >
                Chọn ảnh
              </label>
              {form.images.length > 0 && (
                <span className="text-sm text-gray-500">Đã chọn {form.images.length} ảnh</span>
              )}
            </div>

            {form.images.length > 0 && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                {form.images.map((src, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={src}
                      alt={`img-${idx}`}
                      className="h-28 w-full object-cover rounded-md border"
                      loading="lazy"
                      decoding="async"
                    />
                    <button
                      type="button"
                      onClick={removeImage("images", idx)}
                      className="absolute top-1 right-1 rounded bg-white/80 px-2 text-xs hover:bg-red-500 hover:text-white"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Nút AI sửa ảnh */}
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={aiBusy}
                onClick={openAiImageEditor}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-white font-semibold shadow hover:bg-emerald-600 disabled:opacity-60 animate-pulse"
                title="Mở trình AI sửa ảnh và tự chèn sẵn ảnh đầu tiên của bạn"
              >
                {aiBusy ? "Đang chuẩn bị ảnh…" : "✨ AI sửa ảnh (miễn phí)"}
              </button>
            </div>
          </div>

          {/* Xác minh chính chủ */}
          <div className="rounded-xl border p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Xác minh chính chủ
            </h3>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.agreeOwnerPhone}
                onChange={onToggle("agreeOwnerPhone")}
                className="mt-1"
              />
              <span>
                Tôi cam kết số điện thoại cung cấp liên hệ là <strong>số chính chủ</strong> của chủ nhà đất đăng tin
                và đồng ý để EmyLand xác minh với mục đích <strong>“xác nhận tin đăng”</strong> nhà đất chính chủ
                (hoặc ủy quyền chính chủ công chứng).
              </span>
            </label>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">
                Ảnh sổ đỏ / HĐMB (bắt buộc — chụp phần có <strong>tên chính chủ</strong>, chỉ emyland xem được và bảo mật thông tin khách hàng)
              </label>

              <div className="flex items-center gap-3">
                <input
                  id="legal-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onSelectImages("legalImages", 5)}
                  className="sr-only"
                />
                <label
                  htmlFor="legal-input"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-white hover:bg-amber-50 shadow cursor-pointer whitespace-nowrap"
                >
                  Chọn ảnh pháp lý
                </label>
                {form.legalImages.length > 0 && (
                  <span className="text-sm text-gray-500">Đã chọn {form.legalImages.length} ảnh</span>
                )}
              </div>

              {form.legalImages.length > 0 && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
                  {form.legalImages.map((src, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={src}
                        alt={`legal-${idx}`}
                        className="h-24 w-full object-cover rounded-md border"
                        loading="lazy"
                        decoding="async"
                      />
                      <button
                        type="button"
                        onClick={removeImage("legalImages", idx)}
                        className="absolute top-1 right-1 rounded bg-white/80 px-2 text-xs hover:bg-red-500 hover:text-white"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label className="mt-3 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.agreeLegalTruth}
                onChange={onToggle("agreeLegalTruth")}
                className="mt-1"
              />
              <span>
                Tôi cam kết <strong>hình ảnh pháp lý (sổ đỏ/HĐMB)</strong> và thông tin cung cấp là{" "}
                <strong>đúng sự thật</strong>.
              </span>
            </label>
          </div>
        </section>

        {/* Thông tin liên hệ */}
        <section className="space-y-4 mt-10">
          <h2 className="text-xl font-bold">Thông tin liên hệ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Họ tên *</label>
              <input
                value={form.contactName}
                onChange={onChange("contactName")}
                placeholder="VD: Nguyễn Văn A"
                className="w-full rounded-lg border p-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="name"
                inputMode="text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số điện thoại liên hệ *</label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={onChange("contactPhone")}
                placeholder="VD: 09xxxxxxxx"
                className={`w-full rounded-lg border p-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                  phoneError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                }`}
                aria-invalid={!!phoneError}
                aria-describedby={phoneError ? "contact-phone-error" : undefined}
                autoComplete="tel"
                inputMode="tel"
              />
              {phoneError ? (
                <p id="contact-phone-error" className="mt-1 text-sm text-red-500">{phoneError}</p>
              ) : (
                <p className="mt-1 text-xs italic text-gray-500">
                  (Bạn có thể thay số điện thoại khác với số gợi ý)
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Hàng nút hành động */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-xl border px-6 py-3 font-semibold shadow-sm hover:bg-gray-50"
          >
            Quay về trang chủ
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="rounded-xl border px-6 py-3 font-semibold shadow-sm hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="rounded-xl bg-amber-400 px-6 py-3 font-semibold shadow-sm transition hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEditMode ? "Lưu thay đổi" : "Đăng tin"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostProperty;
TSX

