// src/components/PropertyEditModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

import { StorageManager, type PropertyListing } from "@utils/storage";
import { provinces as PROVINCES, wardsByProvince } from "@/data/vietnam-locations";
import { PROPERTY_TYPES } from "@/data/property-types";

/* >>> Added: Supabase (chỉ thêm, không đổi cấu trúc cũ) */
import { supabase } from "@/lib/supabase";

type ListingType = "sell" | "rent";

/* ---------------- Helpers ---------------- */
const toStr = (v: any) => (v === undefined || v === null ? "" : String(v));

const normalizeImages = (images: any): string[] => {
  try {
    if (Array.isArray(images)) return images.filter(Boolean);
    if (typeof images === "string") {
      try {
        const arr = JSON.parse(images);
        if (Array.isArray(arr)) return arr.filter(Boolean);
      } catch {
        return images
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
  } catch {}
  return [];
};

const provinceOptions = (() => {
  const arr: any[] = Array.isArray(PROVINCES) ? (PROVINCES as any[]) : Object.values(PROVINCES as any);
  return arr.map((p: any) => ({
    id: String(p.provinceId ?? p.id ?? p.value ?? p.code),
    name: p.provinceName ?? p.name ?? p.label ?? String(p.provinceId ?? p.id ?? p.value),
  }));
})();

const provinceByName = (name?: string) => provinceOptions.find((p) => p.name === name);
const provinceById = (id?: string | number) => provinceOptions.find((p) => p.id === String(id));
const wardListByProvinceId = (provId?: string | number): string[] => {
  if (provId === undefined || provId === null) return [];
  const sid = String(provId);
  const raw =
    (wardsByProvince as any)[sid] ??
    (wardsByProvince as any)[Number(sid)] ??
    (wardsByProvince as any)[provinceById(sid)?.name ?? ""] ??
    [];
  if (Array.isArray(raw)) return raw as string[];
  return Object.values(raw ?? {}) as string[];
};

const TYPE_LABEL_BY_VALUE = PROPERTY_TYPES.reduce<Record<string, string>>((acc, t) => {
  acc[t.value] = t.label;
  return acc;
}, {});

/* ====== Upload helpers (preview DataURL) ====== */
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

/* ---------------- Component ---------------- */
interface PropertyEditModalProps {
  property: PropertyListing | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  /** Quyền admin (giữ nguyên prop cũ) */
  isAdmin?: boolean;
  /** Alias mới để tương thích với Dashboard: nếu truyền, sẽ ưu tiên giá trị này */
  canVerify?: boolean;
  /** Ẩn/hiện “Đánh dấu Nổi bật” (mặc định ẩn để đúng yêu cầu) */
  showFeatured?: boolean;
}

const PropertyEditModal: React.FC<PropertyEditModalProps> = ({
  property,
  isOpen,
  onClose,
  onSave,
  isAdmin,
  canVerify,
  showFeatured = false, // ⬅ mặc định ẩn
}) => {
  if (!property) return null;

  // ==== Read old schema ====
  const loc: any = (property as any).location || {};
  const contact: any = (property as any).contactInfo || {};

  const initialProvinceName: string = (property as any).province || loc.province || "";
  const initialProvince = provinceByName(initialProvinceName);
  const initialProvinceId: string = initialProvince?.id ?? "";

  const initialWard: string = (property as any).ward || loc.ward || "";
  const initialAddress: string =
    typeof (property as any).location === "object" && (property as any).location?.address
      ? (property as any).location.address
      : (property as any).address ||
        (typeof (property as any).location === "string"
          ? (property as any).location
          : "") || "";

  // ==== Form state (match PostProperty) ====
  const [listingType, setListingType] = useState<ListingType>(
    ((property as any).listingType as ListingType) || "sell"
  );
  const [propertyType, setPropertyType] = useState<string>(
    (property as any).type ||
      (property as any).type_code ||
      (property as any).property_type ||
      (property as any).propertyType ||
      ""
  );

  // Đơn vị: Bán = TỶ; Thuê = TRIỆU/tháng
  const [priceTy, setPriceTy] = useState<string>(() => {
    const p = Number((property as any).price || 0);
    return p > 0 ? (p / 1_000_000_000).toString() : "";
  });
  const [rentMil, setRentMil] = useState<string>(() => {
    const r = Number((property as any).rent_per_month || 0); // <-- fixed typo
    return r > 0 ? (r / 1_000_000).toString() : "";
  });

  const [title, setTitle] = useState<string>(toStr((property as any).title));
  const [description, setDescription] = useState<string>(
    toStr((property as any).description ?? (property as any).summary)
  );
  const [area, setArea] = useState<string>(toStr((property as any).area));

  const [provinceId, setProvinceId] = useState<string>(initialProvinceId);
  const [provinceName, setProvinceName] = useState<string>(initialProvinceName);
  const [ward, setWard] = useState<string>(initialWard);
  const [address, setAddress] = useState<string>(initialAddress);

  const [contactName, setContactName] = useState<string>(toStr(contact.name));
  const [contactEmail, setContactEmail] = useState<string>(toStr(contact.email));
  const [contactPhone, setContactPhone] = useState<string>(
    toStr(contact.phone ?? (property as any).owner_phone)
  );
  const [mapUrl, setMapUrl] = useState<string>(
    toStr((property as any).mapUrl ?? (property as any).map_link ?? (property as any).google_map_link)
  );

  // Ảnh
  const [images, setImages] = useState<string[]>(normalizeImages((property as any).images));

  // ⬅ Prefill ảnh pháp lý từ prop (nếu Dashboard truyền vào), fallback load từ StorageManager
  const [legalImages, setLegalImages] = useState<string[]>(
    normalizeImages((property as any).legalImages)
  );

  // Thông số thêm
  const [bedrooms, setBedrooms] = useState<string>(toStr((property as any).bedrooms));
  const [bathrooms, setBathrooms] = useState<string>(toStr((property as any).bathrooms));
  const [isHot, setIsHot] = useState<boolean>(!!(property as any).isHot);

  const admin =
    typeof isAdmin === "boolean" ? isAdmin : !!StorageManager.getCurrentUser?.()?.isAdmin;

  // ✔️ Quyền xác minh hợp nhất (ưu tiên canVerify nếu có truyền từ Dashboard)
  const allowVerify = typeof canVerify === "boolean" ? canVerify : admin;

  const [verification, setVerification] = useState<"verified" | "pending" | "unverified">(
    ((property as any).verificationStatus as any) ||
      ((property as any).is_verified ? "verified" : "pending")
  );

  // Load ảnh pháp lý từ kho nếu prop chưa có
  useEffect(() => {
    (async () => {
      if (legalImages.length > 0) return; // đã có từ prop
      try {
        const fn: any = (StorageManager as any).loadLegalImages || (StorageManager as any).getLegalImages;
        if (typeof fn === "function") {
          const arr = await fn((property as any).id);
          if (Array.isArray(arr)) setLegalImages(arr.filter(Boolean));
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property]);

  // ==== Derived ====
  const wardOptions = useMemo(() => wardListByProvinceId(provinceId), [provinceId]);

  useEffect(() => {
    const p = provinceById(provinceId);
    setProvinceName(p?.name ?? "");
    if (ward && !wardOptions.includes(ward)) setWard("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinceId]);

  // VND quy đổi từ các trường nhập theo TỶ/TRIỆU
  const sellPriceVND = useMemo(() => {
    if (listingType !== "sell") return 0;
    const ty = Number(String(priceTy).replace(",", "."));
    return !isFinite(ty) || ty <= 0 ? 0 : Math.round(ty * 1_000_000_000);
  }, [listingType, priceTy]);

  const rentPerMonthVND = useMemo(() => {
    if (listingType !== "rent") return 0;
    const mil = Number(String(rentMil).replace(",", "."));
    return !isFinite(mil) || mil <= 0 ? 0 : Math.round(mil * 1_000_000);
  }, [listingType, rentMil]);

  const pricePerM2Mil = useMemo(() => {
    if (listingType !== "sell") return 0;
    const a = Number(area);
    if (!a || !sellPriceVND) return 0;
    return +(sellPriceVND / 1_000_000 / a).toFixed(2); // triệu/m²
  }, [sellPriceVND, area, listingType]);

  /* ---------------- Upload handlers ---------------- */
  const onSelectImages =
    (field: "images" | "legalImages", limit: number) =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const urls = await filesToDataUrls(files);
      if (field === "images") setImages((cur) => [...cur, ...urls].slice(0, limit));
      else setLegalImages((cur) => [...cur, ...urls].slice(0, limit));
      e.target.value = "";
    };
  const removeImage =
    (field: "images" | "legalImages", idx: number) => () => {
      if (field === "images") setImages((arr) => arr.filter((_, i) => i !== idx));
      else setLegalImages((arr) => arr.filter((_, i) => i !== idx));
    };

  /* ---------------- Save ---------------- */
  const handleSave = async () => {
    try {
      // validate tối thiểu
      if (!title.trim()) throw new Error("Vui lòng nhập Tiêu đề.");
      if (!area || Number(area) <= 0) throw new Error("Diện tích phải > 0.");
      if (!provinceId) throw new Error("Vui lòng chọn Tỉnh/TP.");
      if (!ward) throw new Error("Vui lòng chọn Phường/Xã.");
      if (!propertyType) throw new Error("Vui lòng chọn Loại bất động sản.");
      if (!contactPhone.trim()) throw new Error("Vui lòng nhập Số điện thoại liên hệ.");
      if (listingType === "sell" && !sellPriceVND) throw new Error("Vui lòng nhập Giá bán (tỷ VND).");
      if (listingType === "rent" && !rentPerMonthVND) throw new Error("Vui lòng nhập Giá thuê (triệu/tháng).");
      if (images.length === 0) throw new Error("Vui lòng chọn ít nhất 1 ảnh bất động sản.");
      if (legalImages.length === 0) throw new Error("Vui lòng tải ảnh pháp lý (sổ đỏ/HĐMB).");

      const areaNum = Number(area) || 0;
      const typeLabel = TYPE_LABEL_BY_VALUE[propertyType] || "Nhà đất";

      const next: PropertyListing & any = {
        ...property,
        title: title.trim(),
        description: description?.trim(),
        listingType,
        area: areaNum,

        // quy đổi đơn vị về VND để đồng bộ với code hiện có
        price: listingType === "sell" ? sellPriceVND : 0,
        rent_per_month: listingType === "rent" ? rentPerMonthVND : 0,
        price_per_m2:
          listingType === "sell" && areaNum > 0 && sellPriceVND
            ? Math.round(sellPriceVND / areaNum)
            : undefined,

        // location (schema + phẳng)
        location: {
          province: provinceName,
          ward,
          address: address?.trim(),
          district: (property as any).location?.district || "",
        },
        province: provinceName,
        ward,

        // contact
        contactInfo: {
          ...(property as any).contactInfo,
          name: contactName?.trim(),
          email: contactEmail?.trim(),
          phone: contactPhone?.trim(),
          ownerVerified: verification === "verified",
        },
        owner_phone: contactPhone?.trim(),

        mapUrl: mapUrl?.trim(),
        map_link: mapUrl?.trim(),
        google_map_link: mapUrl?.trim(),

        // ảnh
        images,

        // đồng bộ loại BĐS
        type: propertyType,
        type_code: propertyType,
        typeCode: propertyType,
        property_type: propertyType,
        propertyType: propertyType,
        category_code: propertyType,
        category: typeLabel,
        label: typeLabel,
        group: propertyType,

        bedrooms: bedrooms === "" ? undefined : Number(bedrooms),
        bathrooms: bathrooms === "" ? undefined : Number(bathrooms),
        isHot,

        verificationStatus: verification,
        is_verified: verification === "verified",

        updatedAt: new Date().toISOString(),
      };

      // 🔒 Nếu không có quyền xác minh, không ghi đè các field xác minh
      if (!allowVerify) {
        next.verificationStatus = (property as any).verificationStatus;
        next.is_verified = (property as any).is_verified;
        if (next.contactInfo) {
          next.contactInfo.ownerVerified =
            (property as any)?.contactInfo?.ownerVerified ?? false;
        }
      }

      // Lưu property (giữ toàn bộ logic cũ)
      if (typeof (StorageManager as any).updateProperty === "function") {
        await (StorageManager as any).updateProperty((property as any).id, next);
      } else if (typeof (StorageManager as any).upsertProperty === "function") {
        await (StorageManager as any).upsertProperty(next);
      } else if (typeof (StorageManager as any).saveProperty === "function") {
        await (StorageManager as any).saveProperty(next);
      } else {
        const k = "emyland_properties";
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const arr = JSON.parse(raw) || [];
            const idx = arr.findIndex((x: any) => x.id === (property as any).id);
            if (idx >= 0) arr[idx] = next;
            else arr.unshift(next);
            localStorage.setItem(k, JSON.stringify(arr));
          } else {
            localStorage.setItem(k, JSON.stringify([next]));
          }
        } catch {
          localStorage.setItem(k, JSON.stringify([next]));
        }
      }

      // Lưu ảnh pháp lý nếu có API
      try {
        const fn: any = (StorageManager as any).saveLegalImages;
        if (typeof fn === "function") await fn((property as any).id, legalImages);
      } catch {}

      /* >>> Added: Upsert lên Supabase (cloud), KHÔNG thay đổi flow cũ */
      try {
        const row: any = {
          id: (property as any).id,
          title: next.title,
          description: next.description,
          listing_type: next.listingType,
          property_type: next.propertyType || next.property_type,
          area: next.area,
          price: next.price,
          rent_per_month: next.rent_per_month,
          price_per_m2: next.price_per_m2,
          province: next.province,
          ward: next.ward,
          address: next.location?.address,
          user_email: (property as any).userEmail || (property as any).user_email,
          owner_phone: next.owner_phone,
          verification_status: next.verificationStatus,
          is_verified: next.is_verified,
          images: (Array.isArray(next.images) ? JSON.stringify(next.images) : (typeof next.images==='string' ? next.images : '[]')),
          map_url: next.mapUrl || next.map_link || next.google_map_link,
          updated_at: next.updatedAt,
        };
        await supabase.from("properties").upsert(row, { onConflict: "id" });
      } catch (e: any) {
        console.error("Supabase upsert error:", e);
        // Không chặn UI: chỉ cảnh báo nhẹ
        toast({ title: "Cảnh báo", description: "Không thể đồng bộ Supabase, dữ liệu đã lưu cục bộ.", variant: "default" });
      }

      // phát tín hiệu refresh
      try {
        window.dispatchEvent(new CustomEvent("emyland:properties-changed"));
        localStorage.setItem("emyland_properties_updated", String(Date.now()));
      } catch {}

      toast({ title: "Thành công", description: "Cập nhật tin đăng thành công!" });
      onSave?.();
      onClose?.();
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: (err as any)?.message || "Có lỗi xảy ra khi cập nhật tin đăng!",
        variant: "destructive",
      });
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa tin đăng</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tiêu đề & mô tả */}
          <div>
            <Label htmlFor="title">Tiêu đề *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ví dụ: Văn phòng trung tâm" />
          </div>
          <div>
            <Label htmlFor="desc">Mô tả</Label>
            <Textarea id="desc" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả chi tiết về bất động sản" />
          </div>

          {/* Hình thức + Loại */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Hình thức *</Label>
              <Select value={listingType} onValueChange={(v: ListingType) => setListingType(v)}>
                <SelectTrigger><SelectValue placeholder="Chọn hình thức" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sell">Bán</SelectItem>
                  <SelectItem value="rent">Cho thuê</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Loại bất động sản *</Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger><SelectValue placeholder="Chọn loại bất động sản" /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Giá + DT + Giá/m² */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {listingType === "sell" ? (
              <div>
                <Label>Giá bán (tỷ VND) *</Label>
                <Input inputMode="decimal" value={priceTy} onChange={(e) => setPriceTy(e.target.value)} placeholder="VD: 3.2" />
                <p className="mt-1 text-xs text-gray-500">
                  Ước tính: <strong>{pricePerM2Mil || 0}</strong> triệu/m².
                </p>
              </div>
            ) : (
              <div>
                <Label>Giá thuê (triệu/tháng) *</Label>
                <Input inputMode="decimal" value={rentMil} onChange={(e) => setRentMil(e.target.value)} placeholder="VD: 12" />
              </div>
            )}
            <div>
              <Label>Diện tích (m²) *</Label>
              <Input inputMode="numeric" value={area} onChange={(e) => setArea(e.target.value)} placeholder="80" />
            </div>
            <div>
              <Label>Giá/m² (tự tính)</Label>
              <Input disabled value={listingType === "sell" && pricePerM2Mil ? `${pricePerM2Mil} triệu/m²` : ""} />
            </div>
          </div>

          {/* Vị trí */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Tỉnh/TP *</Label>
              <Select value={provinceId} onValueChange={(v) => setProvinceId(v)}>
                <SelectTrigger><SelectValue placeholder="Chọn Tỉnh/TP" /></SelectTrigger>
                <SelectContent>
                  {provinceOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phường/Xã *</Label>
              <Select value={ward} onValueChange={setWard}>
                <SelectTrigger><SelectValue placeholder="Chọn Phường/Xã" /></SelectTrigger>
                <SelectContent>
                  {wardOptions.map((w) => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="addr">Địa chỉ cụ thể</Label>
            <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Số nhà, tên đường…" />
          </div>

          {/* Liên hệ + Map */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Họ tên liên hệ</Label>
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Số điện thoại liên hệ *</Label>
              <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="09xxxxxxxx" />
            </div>
            <div>
              <Label>Link vị trí Google Maps</Label>
              <Input value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} placeholder="https://maps.google.com/..." />
            </div>
          </div>

          {/* Ảnh BĐS */}
          <div className="space-y-2">
            <Label>Ảnh bất động sản (tối đa 10, ≤ 8MB/ảnh)</Label>
            <input type="file" accept="image/*" multiple onChange={onSelectImages("images", 10)} />
            {images.length > 0 && (
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
                {images.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} className="h-28 w-full object-cover rounded-md border" />
                    <button
                      type="button"
                      onClick={removeImage("images", i)}
                      className="absolute top-1 right-1 rounded bg-white/80 px-2 text-xs hover:bg-red-500 hover:text-white"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ảnh pháp lý */}
          <div className="space-y-2">
            <Label>Ảnh sổ đỏ / HĐMB (tối đa 5 ảnh)</Label>
            <input type="file" accept="image/*" multiple onChange={onSelectImages("legalImages", 5)} />
            {legalImages.length > 0 && (
              <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-3">
                {legalImages.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} className="h-24 w-full object-cover rounded-md border" />
                    <button
                      type="button"
                      onClick={removeImage("legalImages", i)}
                      className="absolute top-1 right-1 rounded bg-white/80 px-2 text-xs hover:bg-red-500 hover:text-white"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Thông số + Xác minh/HOT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Số phòng ngủ</Label>
              <Input inputMode="numeric" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
            </div>
            <div>
              <Label>Số WC</Label>
              <Input inputMode="numeric" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            {/* Ẩn theo yêu cầu nhưng không xoá logic */}
            {showFeatured && (
              <div className="flex items-center gap-3">
                <Switch checked={isHot} onCheckedChange={setIsHot} />
                <span>Đánh dấu Nổi bật</span>
              </div>
            )}
            {allowVerify && (
              <div className="flex items-center gap-3 ml-auto">
                <Label>Trạng thái xác minh</Label>
                <Select value={verification} onValueChange={(v: any) => setVerification(v)}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unverified">Chưa xác minh</SelectItem>
                    <SelectItem value="pending">Đang xác nhận</SelectItem>
                    <SelectItem value="verified">Đã xác nhận</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Hủy</Button>
            <Button onClick={handleSave}>Lưu thay đổi</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyEditModal;
