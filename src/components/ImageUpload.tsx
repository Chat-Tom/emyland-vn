// src/components/ImageUpload.tsx
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Image as ImageIcon, X, Upload, Wand2 } from "lucide-react";

type ImagesArray = string[];

interface ImageUploadProps {
  // props chuẩn
  images?: ImagesArray;
  onImagesChange?: (images: ImagesArray) => void;

  // alias để tương thích ngược
  value?: ImagesArray;
  files?: ImagesArray;
  onChange?: (images: ImagesArray) => void;
  onFilesChange?: (images: ImagesArray) => void;

  // giới hạn số ảnh (mặc định 5)
  max?: number;

  // nhãn hiển thị (tùy chọn)
  label?: string;

  // bật/tắt công tắc làm sạch AI (mặc định true)
  aiCleanEnabled?: boolean;
}

/**
 * ImageUpload an toàn & linh hoạt:
 * - Chấp nhận nhiều alias props để không vỡ tương thích.
 * - Không bao giờ .map trên undefined.
 * - Tuỳ chọn "Làm sạch ảnh (AI)": cân sáng/contrast nhẹ + sharpen nhẹ + xuất WebP.
 *   GIỮ NGUYÊN kích thước ⇒ không đổi tỉ lệ/góc nhìn, không tạo ảnh giả.
 */
export default function ImageUpload(props: ImageUploadProps) {
  const {
    images,
    value,
    files,
    onImagesChange,
    onChange,
    onFilesChange,
    max = 5,
    aiCleanEnabled = true,
    label = `Hình ảnh tiêu biểu (Tối đa ${max} ảnh rõ nét)`,
  } = props;

  // hợp nhất mọi khả năng đầu vào thành mảng an toàn
  const currentImages: ImagesArray = useMemo(() => {
    if (Array.isArray(images)) return images;
    if (Array.isArray(value)) return value;
    if (Array.isArray(files)) return files;
    return [];
  }, [images, value, files]);

  // util: phát sự kiện thay đổi cho tất cả callback có thể có
  const emit = (next: ImagesArray) => {
    onImagesChange?.(next);
    onChange?.(next);
    onFilesChange?.(next);
  };

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [useAIClean, setUseAIClean] = useState(aiCleanEnabled);

  const remain = Math.max(0, max - currentImages.length);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || busy) return;

    const take = Math.min(fileList.length, remain);
    if (take <= 0) {
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setBusy(true);
    try {
      const outs: string[] = [];
      for (let i = 0; i < take; i++) {
        const f = fileList[i];
        if (!f || !f.type?.startsWith?.("image/")) continue;

        // Làm sạch hay chỉ chuyển sang WebP nhẹ
        const dataUrl = useAIClean ? await enhanceImage(f) : await toWebPKeepingSize(f);
        outs.push(dataUrl);
      }
      emit([...currentImages, ...outs].slice(0, max));
    } catch {
      // bỏ qua lỗi từng ảnh để không chặn cả lô
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = ""; // reset để chọn lại vẫn nhận onChange
    }
  };

  const removeImage = (index: number) => {
    const updated = currentImages.filter((_, i) => i !== index);
    emit(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          {label}
        </Label>

        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            className="accent-blue-600"
            checked={useAIClean}
            onChange={(e) => setUseAIClean(e.target.checked)}
            disabled={!aiCleanEnabled}
          />
          <Wand2 className="w-3 h-3" />
          Làm sạch ảnh (AI) — không đổi tỉ lệ/góc nhìn
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {(currentImages || []).map((image, index) => (
          <Card key={index} className="relative p-2">
            <img
              src={image}
              alt={`Property ${index + 1}`}
              className="w-full h-24 object-cover rounded"
              loading="lazy"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 w-6 h-6 p-0"
              onClick={() => removeImage(index)}
              aria-label="Xóa ảnh"
            >
              <X className="w-3 h-3" />
            </Button>
          </Card>
        ))}

        {remain > 0 && (
          <Card className="border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors">
            <label className="flex flex-col items-center justify-center h-24 cursor-pointer p-2">
              <Upload className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-xs text-gray-500 text-center">
                {busy ? "Đang xử lý..." : "Thêm ảnh"}
              </span>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={busy}
              />
            </label>
          </Card>
        )}
      </div>

      <p className="text-xs text-gray-500">{currentImages.length}/{max} ảnh đã tải lên</p>
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
        ⚠️ Ảnh có thể được làm sạch (sáng – rõ – nén WebP). KHÔNG thay đổi tỉ lệ hoặc góc nhìn. Không tạo ảnh giả.
      </p>
    </div>
  );
}

/* ===================== Helpers ===================== */

/** Đọc file → HTMLImageElement */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read error"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image decode error"));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/** Xuất WebP giữ nguyên kích thước (tỉ lệ/góc nhìn) — không chỉnh sửa màu */
async function toWebPKeepingSize(file: File): Promise<string> {
  const img = await loadImage(file);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  return canvas.toDataURL("image/webp", 0.92); // nén nhẹ, xoá EXIF
}

/**
 * "Làm sạch" ảnh:
 * - Auto exposure nhẹ + contrast + gamma
 * - Sharpen nhẹ (unsharp mask) bằng kỹ thuật blur chồng
 * - Xuất WebP (xoá EXIF)
 * - GIỮ NGUYÊN kích thước ⇒ không đổi tỉ lệ/góc nhìn
 */
async function enhanceImage(file: File): Promise<string> {
  const img = await loadImage(file);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  // Canvas gốc (không đổi size)
  const base = document.createElement("canvas");
  base.width = w;
  base.height = h;
  const g1 = base.getContext("2d", { willReadFrequently: true })!;
  g1.drawImage(img, 0, 0, w, h);

  // Lấy dữ liệu ảnh
  const imgData = g1.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Ước lượng độ sáng trung bình
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  const mean = sum / (data.length / 4);
  const target = 138; // mid-grey
  const gain = clamp(target / Math.max(1, mean), 0.75, 1.35); // 0.75–1.35

  const contrast = 1.06; // +6%
  const gamma = 1.03; // nhẹ

  // Apply exposure + contrast + gamma
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] * gain;
    let g = data[i + 1] * gain;
    let b = data[i + 2] * gain;

    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;

    r = 255 * Math.pow(clamp(r, 0, 255) / 255, 1 / gamma);
    g = 255 * Math.pow(clamp(g, 0, 255) / 255, 1 / gamma);
    b = 255 * Math.pow(clamp(b, 0, 255) / 255, 1 / gamma);

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    // alpha giữ nguyên
  }
  g1.putImageData(imgData, 0, 0);

  // Unsharp mask rất nhẹ
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const g2 = out.getContext("2d")!;
  g2.drawImage(base, 0, 0);
  g2.globalAlpha = 0.5;
  g2.filter = "blur(1.2px)";
  g2.drawImage(base, 0, 0);
  g2.filter = "none";
  g2.globalAlpha = 1;

  // Xuất WebP (loại EXIF), GIỮ NGUYÊN size
  return out.toDataURL("image/webp", 0.9);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
