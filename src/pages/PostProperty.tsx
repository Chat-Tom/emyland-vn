// src/pages/PostProperty.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// Alias đúng dự án
import { StorageManager } from "@utils/storage";
import { PROPERTY_TYPES } from "@/data/property-types";
import { provinces, wardsByProvince } from "@/data/vietnam-locations";
import { supabase } from "@/lib/supabase";

type ListingType = "sell" | "rent";

// 6 thành phố lớn ưu tiên đầu
const BIG6_ORDER = [
  "Thành phố Hồ Chí Minh",
  "Thành phố Hà Nội",
  "Thành phố Đà Nẵng",
  "Thành phố Hải Phòng",
  "Thành phố Cần Thơ",
  "Thành phố Huế",
];

// Bucket public để upload ảnh tạm phục vụ AI editor
const AI_TMP_BUCKET =
  (import.meta as any)?.env?.VITE_SUPABASE_BUCKET_PUBLIC || "public";

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

// dataURL -> Blob
function dataURLtoBlob(dataUrl: string): Blob {
  // data:[<mediatype>][;base64],<data>
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
  // URI encoded
  const u8 = new Uint8Array(unescape(data).split("").map((c) => c.charCodeAt(0)));
  return new Blob([u8], { type: mime || "image/jpeg" });
}

type FormState = {
  provinceId: string;
  ward: string;
  address: string;
  mapUrl: string;

  listingType: ListingType;

  propertyType: string;
  area: string;        // m²
  priceTy: string;     // BÁN: nhập theo TỶ VND
  rentMil: string;     // THUÊ: nhập theo TRIỆU / tháng
  title: string;
  description: string;

  images: string[];     // ảnh BĐS (dataURL hoặc http)
  legalImages: string[];// ảnh pháp lý (dataURL)

  contactName: string;
  contactPhone: string;
  contactEmail: string;

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
  images: [],
  legalImages: [],
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  agreeOwnerPhone: true,
  agreeLegalTruth: true,
};

const PostProperty: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [aiBusy, setAiBusy] = useState(false);

  // Prefill từ user hiện tại
  useEffect(() => {
    const cur = StorageManager.getCurrentUser();
    if (!cur || !cur.isLoggedIn) {
      navigate("/login");
      return;
    }
    setForm((f) => ({
      ...f,
      contactName: cur.fullName || "",
      contactPhone: cur.phone || "",
      contactEmail: cur.email || "",
    }));
  }, [navigate]);

  // Sắp xếp tỉnh: BIG6 trước, còn lại A->Z, bỏ dòng "Tỉnh / Thành Phố"
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

  // Phường/Xã theo tỉnh: "Phường" trước, "Xã" sau, A->Z
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

  // Giá tính ra VND theo hình thức
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
    return +(sellPriceVND / 1_000_000 / area).toFixed(2); // triệu/m²
  }, [sellPriceVND, form.area, form.listingType]);

  // Helpers
  const onChange =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
    };
  const onToggle =
    (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.checked }));
    };

  const filesToDataUrls = (files: FileList) =>
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
      const urls = await filesToDataUrls(files);
      setForm((f) => {
        const merged = [...f[field], ...urls].slice(0, limit);
        return { ...f, [field]: merged };
      });
      e.target.value = ""; // reset input
    };

  const removeImage =
    (field: "images" | "legalImages", idx: number) => () => {
      setForm((f) => {
        const clone = f[field].slice();
        clone.splice(idx, 1);
        return { ...f, [field]: clone };
      });
    };

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
    if (form.images.length === 0) return "Vui lòng chọn ít nhất 1 ảnh bất động sản.";
    if (form.legalImages.length === 0)
      return "Vui lòng tải ảnh pháp lý (sổ đỏ/HĐMB) — chụp phần có tên chính chủ.";
    if (!form.agreeOwnerPhone || !form.agreeLegalTruth)
      return "Bạn cần đồng ý hai cam kết để tiếp tục.";
    return null;
  };

  const onSubmit = () => {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }
    const current = StorageManager.getCurrentUser();
    if (!current || !current.isLoggedIn) {
      alert("Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.");
      navigate("/login");
      return;
    }

    const id = StorageManager.generateId();
    const now = new Date().toISOString();
    const provinceName =
      sortedProvinces.find((p) => p.provinceId === form.provinceId)?.provinceName || "";

    // Chuẩn hoá đối tượng lưu local
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
        phone: form.contactPhone.trim(), // ✅ chính chủ
        email: form.contactEmail.trim(),
        ownerVerified: false, // ⬅️ MẶC ĐỊNH CHƯA XÁC MINH
      },
      verificationStatus: "pending", // ⬅️ Hiển thị "Đang xác nhận chính chủ"
      images: form.images,
      userEmail: current.email, // Dashboard lọc theo email
      createdAt: now,
      updatedAt: now,
      listingType: form.listingType, // ✅ rất quan trọng để Home lọc đúng
    };

    if (form.listingType === "sell") {
      property.price = sellPriceVND;
      property.price_per_m2 =
        property.area > 0 && sellPriceVND ? Math.round(sellPriceVND / property.area) : undefined;
    } else {
      property.rent_per_month = rentPerMonthVND; // ✅ cho thuê
    }

    // Lưu tin + ảnh pháp lý
    StorageManager.saveProperty(property);
    StorageManager.saveLegalImages(id, form.legalImages);

    // Phát tín hiệu để Home/đếm số tin tự refresh
    try {
      window.dispatchEvent(new CustomEvent("emyland:properties-changed"));
      localStorage.setItem("emyland_properties_updated", String(Date.now()));
    } catch {}

    alert("Đăng tin thành công! Tin của bạn đang ở trạng thái 'Đang xác nhận chính chủ'.");
    navigate("/dashboard"); // Dashboard sẽ nhận sự kiện và hiển thị tin mới
  };

  // ====== AI: mở Copilot với prompt làm sẵn từ các trường ======
  const openCopilotForDescription = () => {
    const title = form.title || "Tiêu đề";
    const area = form.area || "0";
    const typeLabel =
      PROPERTY_TYPES.find((t) => t.value === form.propertyType)?.label || "Nhà đất";
    const provinceName =
      sortedProvinces.find((p) => p.provinceId === form.provinceId)?.provinceName || "Tỉnh/Thành";
    const listingText = form.listingType === "rent" ? "cho thuê" : "bán";

    const seed = `
Bạn là chuyên gia viết bài đăng bất động sản.
Hãy viết giúp tôi một đoạn mô tả ngắn gọn (120–180 từ), súc tích, hấp dẫn, đúng sự thật – không phóng đại, không gây hiểu nhầm.
- Tiêu đề: ${title}
- Loại: ${typeLabel} • ${listingText}
- Diện tích: ${area} m²
- Khu vực gần đúng: ${provinceName}
- Yêu cầu: trình bày tự nhiên, có bullet ngắn gọn nếu hợp lý, có lời kêu gọi hành động nhẹ nhàng.
Nếu có thông tin liên hệ, chỉ kết thúc bằng câu mời liên hệ, không chèn số điện thoại.`;

    const url = `https://copilot.microsoft.com/?q=${encodeURIComponent(seed)}`;
    window.open(url, "_blank");
  };

  // ====== AI: sửa ảnh – ưu tiên Photopea (miễn phí, không cần đăng nhập),
  // nhận trực tiếp data:URL; nếu quá lớn sẽ upload tạm lên Supabase để lấy public URL.
  const openAiImageEditor = async () => {
    if (!form.images.length) {
      alert("Bạn hãy chọn ít nhất 1 ảnh bất động sản trước đã nhé.");
      return;
    }
    setAiBusy(true);

    // mở cửa sổ sớm để tránh chặn popup
    const win = window.open("about:blank", "_blank");

    try {
      const src = form.images[0];

      // HTTP/HTTPS -> mở Photopea bằng iurl
      if (isValidUrl(src)) {
        const pp = `https://www.photopea.com/#iurl=${encodeURIComponent(src)}`;
        if (win) win.location.href = pp; else window.open(pp, "_blank");
        return;
      }

      // data:URL nhỏ -> truyền trực tiếp qua "files"
      if (src.startsWith("data:") && src.length < 1_600_000) {
        const cfg = { files: [src] };
        const pp = `https://www.photopea.com/#${encodeURIComponent(JSON.stringify(cfg))}`;
        if (win) win.location.href = pp; else window.open(pp, "_blank");
        return;
      }

      // data:URL lớn -> upload lên Supabase public rồi mở Photopea
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
        if (win) win.location.href = pp; else window.open(pp, "_blank");
        return;
      }

      // fallback Pixlr nếu có lỗi bất ngờ
      const fallback = "https://pixlr.com/vn/editor/";
      if (win) win.location.href = fallback; else window.open(fallback, "_blank");
    } catch (e) {
      if (win) win.close();
      alert("Không thể chuẩn bị ảnh tự động. Mình sẽ mở trình sửa ảnh, bạn hãy dán ảnh thủ công (Ctrl+V) nhé.");
      window.open("https://pixlr.com/vn/editor/", "_blank");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-extrabold text-center mb-8">Đăng tin bất động sản</h1>

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
                />
                <button
                  type="button"
                  disabled={!isValidUrl(form.mapUrl)}
                  onClick={() => window.open(form.mapUrl, "_blank")}
                  className="px-4 rounded-lg border bg-amber-400 text-black hover:bg-amber-500 disabled:opacity-50 shadow"
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
                placeholder="VD: Căn góc, 2PN, mặt đường"
                className="w-full rounded-lg border p-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Mô tả */}
            <div className="relative md:col-span-2">
              <label className="block text-sm font-medium mb-1">Mô tả *</label>
              <textarea
                rows={5}
                value={form.description}
                onChange={onChange("description")}
                placeholder="Mô tả chi tiết bất động sản, tiện ích xung quanh..."
                className="w-full rounded-lg border p-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {/* Nút AI mô tả – góc phải dưới, nhấp nháy */}
              <div className="absolute -bottom-3 right-0 translate-y-full mt-2 flex items-center gap-2">
                <em className="text-xs text-gray-500 hidden sm:block">
                  AI giúp bạn mô tả nhà đất súc tích, cuốn hút người đọc…
                </em>
                <button
                  type="button"
                  onClick={openCopilotForDescription}
                  className="px-3 py-2 rounded-lg bg-amber-400 text-black font-semibold shadow hover:bg-amber-500 transition animate-pulse"
                  title="Mở Copilot với gợi ý từ nội dung bạn đã nhập"
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

          {/* Ảnh BĐS */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Ảnh bất động sản (tối đa 10, ≤ 8MB/ảnh)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onSelectImages("images", 10)}
              className="block"
            />
            {form.images.length > 0 && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                {form.images.map((src, idx) => (
                  <div key={idx} className="relative">
                    <img src={src} alt={`img-${idx}`} className="h-28 w-full object-cover rounded-md border" />
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
                Tôi cam kết số <strong>điện thoại</strong> cung cấp là <strong>chính chủ</strong> của
                bất động sản này và đồng ý để EmyLand xác minh nhằm xác nhận tin đăng nhà đất chính chủ
                (hoặc ủy quyền chính chủ công chứng).
              </span>
            </label>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">
                Ảnh sổ đỏ / HĐMB (bắt buộc — chụp phần có <strong>tên chính chủ</strong>, tối đa 5 ảnh)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onSelectImages("legalImages", 5)}
              />
              {form.legalImages.length > 0 && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
                  {form.legalImages.map((src, idx) => (
                    <div key={idx} className="relative">
                      <img src={src} alt={`legal-${idx}`} className="h-24 w-full object-cover rounded-md border" />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Họ tên *</label>
              <input
                value={form.contactName}
                onChange={onChange("contactName")}
                placeholder="VD: Nguyễn Văn A"
                className="w-full rounded-lg border p-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số điện thoại *</label>
              <input
                value={form.contactPhone}
                onChange={onChange("contactPhone")}
                placeholder="VD: 09xxxxxxxx"
                className="w-full rounded-lg border p-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={onChange("contactEmail")}
                placeholder="VD: email@domain.com"
                className="w-full rounded-lg border p-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={onSubmit}
            className="rounded-xl bg-amber-400 px-6 py-3 font-semibold shadow-sm transition hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            Đăng tin
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostProperty;
