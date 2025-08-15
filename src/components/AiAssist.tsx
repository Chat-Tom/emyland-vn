// src/components/AiAssist.tsx
import React, { useState } from "react";

type AiAssistProps = {
  /** Thu thập dữ liệu đang có trên form để ghép prompt */
  collectPromptFields: () => {
    title?: string;
    type?: string;          // apartment/house/villa/office/land/social hoặc nhãn TV
    listingType?: "sell" | "rent";
    area?: number;
    location?: string;
    highlights?: string;    // điểm nhấn/ghi chú thêm (nếu có)
  };
  /** Nhận mô tả (khi user dán/đổi) nếu muốn đồng bộ về state ngoài */
  onSetDescription?: (desc: string) => void;

  /** (Tuỳ chọn) callback khi ảnh đã được làm mượt */
  onImagesEnhanced?: (files: File[]) => void;
};

export default function AiAssist({ collectPromptFields, onSetDescription, onImagesEnhanced }: AiAssistProps) {
  const [busyCopy, setBusyCopy] = useState(false);
  const [busyEnhance, setBusyEnhance] = useState(false);

  const buildPrompt = () => {
    const { title, type, listingType, area, location, highlights } = collectPromptFields() || {};
    return (
`Viết mô tả bất động sản bằng tiếng Việt, trung thực, súc tích (120–180 từ).
Tiêu đề: ${title || "—"}
Loại: ${type || "—"} • ${listingType === "rent" ? "Cho thuê" : "Bán"} • Diện tích: ${area || "—"} m²
Khu vực/địa chỉ gần đúng: ${location || "—"}
Yêu cầu:
- Chỉ nêu thông tin có thật; không bịa đặt pháp lý/tiện ích.
- 4–6 điểm nổi bật (giao thông, tiện ích, nội thất, tiềm năng).
- Dễ đọc, câu ngắn gọn.
${highlights ? `Ưu tiên nêu: ${highlights}` : ""}

Trả về đúng 1 đoạn văn hoàn chỉnh.`
    ).trim();
  };

  async function copyAndOpen(url: string, withQuery: boolean) {
    const prompt = buildPrompt();
    setBusyCopy(true);
    try {
      await navigator.clipboard.writeText(prompt);
      const finalUrl = withQuery ? `${url}${encodeURIComponent(prompt)}` : url;
      window.open(finalUrl, "_blank", "noopener,noreferrer");
      // gợi ý dán vào textarea nếu dev muốn
      onSetDescription?.("");
      alert("Đã sao chép prompt. Dán vào ô chat ở tab mới nhé!");
    } catch {
      // fallback
      const finalUrl = withQuery ? `${url}${encodeURIComponent(prompt)}` : url;
      window.open(finalUrl, "_blank", "noopener,noreferrer");
    } finally {
      setBusyCopy(false);
    }
  }

  async function handleChooseImages() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (!files.length) return;
      setBusyEnhance(true);
      try {
        const enhanced = await enhanceImagesClient(files);
        onImagesEnhanced?.(enhanced);
        alert("Đã xử lý ảnh sáng/đậm nét nhẹ (client-side).");
      } finally {
        setBusyEnhance(false);
      }
    };
    input.click();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Gợi ý mô tả */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => copyAndOpen("https://chat.openai.com/", false)}
          className="px-3 py-1.5 rounded-lg bg-black text-white hover:opacity-90"
        >
          {busyCopy ? "Đang sao chép..." : "AI gợi ý (ChatGPT)"}
        </button>
        <button
          type="button"
          onClick={() => copyAndOpen("https://www.perplexity.ai/search?q=", true)}
          className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
          title="Mở Perplexity với prompt đã chèn sẵn"
        >
          Mở Perplexity
        </button>
        <button
          type="button"
          onClick={() => copyAndOpen("https://www.bing.com/chat?q=", true)}
          className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
          title="Mở Copilot (đôi khi bỏ qua tham số q)"
        >
          Mở Copilot
        </button>
      </div>

      {/* Làm mượt ảnh (miễn phí) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleChooseImages}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
          title="Tăng sáng/độ tương phản/bão hòa nhẹ ngay trên trình duyệt"
        >
          {busyEnhance ? "Đang xử lý ảnh..." : "Làm mượt ảnh (miễn phí)"}
        </button>
      </div>
    </div>
  );
}

/* ================== ẢNH: canvas enhance client-side ================== */
/** Tăng sáng/contrast/bão hòa nhẹ, giữ màu tự nhiên; không thay đổi nội dung cảnh. */
export async function enhanceImagesClient(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const f of files) {
    const enhanced = await enhanceOne(f, { brightness: 12, contrast: 12, saturation: 1.12 });
    out.push(enhanced);
  }
  return out;
}

async function enhanceOne(file: File, opts: { brightness: number; contrast: number; saturation: number }) {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;

  // brightness: -255..+255 ; contrast: -255..+255 ; saturation: factor (e.g. 1.12)
  const b = opts.brightness; // ≈ +12/255 ~ 4-5%
  const c = opts.contrast;
  const s = opts.saturation;

  const cf = (259 * (c + 255)) / (255 * (259 - c)); // contrast factor

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], bch = d[i + 2];

    // brightness + contrast
    r = clamp(cf * (r - 128) + 128 + b);
    g = clamp(cf * (g - 128) + 128 + b);
    bch = clamp(cf * (bch - 128) + 128 + b);

    // saturation (approx): gray + (color-gray)*s
    const gray = 0.2989 * r + 0.587 * g + 0.114 * bch;
    r = clamp(gray + (r - gray) * s);
    g = clamp(gray + (g - gray) * s);
    bch = clamp(gray + (bch - gray) * s);

    d[i] = r; d[i + 1] = g; d[i + 2] = bch;
    // alpha giữ nguyên
  }

  ctx.putImageData(img, 0, 0);

  const blob: Blob = await new Promise((resolve) => canvas.toBlob((bb) => resolve(bb as Blob), "image/jpeg", 0.9));
  return new File([blob], file.name.replace(/\.(\w+)$/i, "_enhanced.$1"), { type: "image/jpeg" });
}

function clamp(x: number) { return x < 0 ? 0 : x > 255 ? 255 : x | 0; }
