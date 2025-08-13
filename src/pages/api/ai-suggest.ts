// api/ai-suggest.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { mode, form } = req.body as {
    mode: "outline" | "short" | "seo";
    form: {
      province?: string;
      ward?: string;
      address?: string;
      propertyType?: string;
      area?: string | number;
      price?: string | number;
      bedrooms?: string | number;
      bathrooms?: string | number;
      description?: string;
    };
  };

  const sys =
    "Bạn là trợ lý viết tin BĐS bằng tiếng Việt cho EmyLand. " +
    "Không bịa đặt. Nếu thiếu dữ liệu thì hỏi lại hoặc bỏ qua phần đó. Văn minh, rõ ràng, không dùng từ ngữ nhạy cảm. " +
    "Trả về văn bản thuần (không markdown).";

  const task =
    mode === "outline"
      ? "Viết gợi ý mô tả chi tiết, có cấu trúc: Tổng quan; Vị trí - kết nối; Pháp lý; Tiện ích xung quanh; Điểm nổi bật."
      : mode === "seo"
      ? "Viết mô tả chuẩn SEO: mở đầu 1-2 câu hấp dẫn + 3-5 gạch đầu dòng chốt lợi ích + đoạn kết có CTA lịch sự. Tối đa ~120-150 từ."
      : "Rút gọn mô tả hiện tại thành 3-5 câu rõ ý, giữ thông tin chính, tránh lặp.";

  const user = {
    province: form.province,
    ward: form.ward,
    address: form.address,
    type: form.propertyType,
    area: form.area,
    price: form.price,
    bedrooms: form.bedrooms,
    bathrooms: form.bathrooms,
    existingDescription: form.description,
  };

  try {
    // Dùng Responses API của SDK openai v4
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: sys },
        {
          role: "user",
          content:
            `Nhiệm vụ: ${task}\n` +
            `Dữ liệu: ${JSON.stringify(user, null, 2)}\n` +
            `Yêu cầu chung: Viết tự nhiên, lịch sự; tránh thông tin không chắc chắn; không nêu thông tin pháp lý nếu không có.`,
        },
      ],
      temperature: 0.7,
    });

    // SDK có trợ giúp lấy text
    // @ts-ignore - output_text có sẵn trong SDK v4
    const text = (response as any).output_text?.trim() ?? "";
    return res.status(200).json({ text });
  } catch (err: any) {
    console.error("ai-suggest error:", err);
    return res.status(500).json({ error: "AI error" });
  }
}
