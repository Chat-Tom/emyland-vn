import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// ⚠️ Alias khớp project của bạn
import { StorageManager } from "@utils/storage";
import { PROPERTY_TYPES } from "@/data/property-types";
import { provinces, wardsByProvince } from "@/data/vietnam-locations";

// 6 thành phố lớn ưu tiên đầu
const BIG6_ORDER = [
  "Thành phố Hồ Chí Minh",
  "Thành phố Hà Nội",
  "Thành phố Đà Nẵng",
  "Thành phố Hải Phòng",
  "Thành phố Cần Thơ",
  "Thành phố Huế",
];

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

type FormState = {
  provinceId: string;
  ward: string;
  address: string;
  mapUrl: string;

  propertyType: string;
  area: string; // m²
  priceTy: string; // đơn vị TỶ VND
  title: string;
  description: string;

  images: string[]; // ảnh BĐS (dataURL)
  legalImages: string[]; // ảnh pháp lý (dataURL)

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
  propertyType: "",
  area: "",
  priceTy: "",
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

  // Giá VND + ước tính giá trên m² (triệu/m²)
  const priceVND = useMemo(() => {
    const ty = Number(String(form.priceTy).replace(",", "."));
    if (!isFinite(ty) || ty <= 0) return 0;
    return Math.round(ty * 1_000_000_000);
  }, [form.priceTy]);

  const pricePerM2Mil = useMemo(() => {
    const area = Number(form.area);
    if (!area || !priceVND) return 0;
    return +(priceVND / 1_000_000 / area).toFixed(2);
  }, [priceVND, form.area]);

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
    if (!priceVND) return "Vui lòng nhập giá (tính theo TỶ VND).";
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

    const property: any = {
      id,
      title: form.title.trim(),
      description: form.description.trim(),
      price: priceVND,
      area: Number(form.area),
      propertyType: form.propertyType,
      location: {
        province: provinceName,
        district: "",
        ward: form.ward,
        address: form.address.trim(),
      },
      contactInfo: {
        name: form.contactName.trim(),
        phone: form.contactPhone.trim(),
        email: form.contactEmail.trim(),
        ownerVerified: true,
      },
      images: form.images,
      userEmail: current.email,
      createdAt: now,
      updatedAt: now,
    };

    // Lưu tin
    StorageManager.saveProperty(property);

    // Lưu ảnh pháp lý cho admin
    try {
      localStorage.setItem(`emyland_legal_images:${id}`, JSON.stringify(form.legalImages));
    } catch {}

    alert("Đăng tin thành công!");
    navigate("/dashboard");
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
                  className="px-4 rounded-lg border bg-white hover:bg-yellow-50 disabled:opacity-50"
                >
                  Mở bản đồ
                </button>
              </div>
            </div>
          </div>
        </section>

        <hr className="my-6" />

        {/* Thông tin nhà đất */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Thông tin nhà đất</h2>

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

            {/* Giá */}
            <div>
              <label className="block text-sm font-medium mb-1">Giá (tỷ VND) *</label>
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
                Giá thuê (nếu cho thuê): nhập theo <strong>triệu/tháng</strong>. • Ước tính:{" "}
                <strong>{pricePerM2Mil || 0}</strong> triệu/m².
              </p>
            </div>

            {/* Tiêu đề */}
            <div>
              <label className="block text-sm font-medium mb-1">Tiêu đề *</label>
              <input
                value={form.title}
                onChange={onChange("title")}
                placeholder="VD: Căn góc, 2PN, mặt đường"
                className="w-full rounded-lg border p-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Mô tả */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Mô tả *</label>
              <textarea
                rows={5}
                value={form.description}
                onChange={onChange("description")}
                placeholder="Mô tả chi tiết bất động sản, tiện ích xung quanh..."
                className="w-full rounded-lg border p-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        <hr className="my-6" />

        {/* Hình ảnh & xác minh */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Hình ảnh</h2>

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

        <hr className="my-6" />

        {/* Thông tin liên hệ */}
        <section className="space-y-4">
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
