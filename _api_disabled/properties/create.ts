// api/properties/create.ts
export const config = { runtime: "nodejs" };
import { createClient } from "@supabase/supabase-js";

/** Đọc JSON body an toàn */
async function readJson(req: any) {
  if (req?.body && typeof req.body === "object") return req.body;
  if (req?.body && typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch {}
  }
  const raw: string = await new Promise((resolve) => {
    let s = "";
    req.on?.("data", (c: any) => (s += c));
    req.on?.("end", () => resolve(s));
    setTimeout(() => resolve(""), 0);
  });
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

/** Ép/chuẩn hoá danh sách ảnh sang TEXT (JSON-string của mảng) */
function imagesText(v: any): string | null {
  try {
    if (!v) return null;
    if (Array.isArray(v)) return JSON.stringify(v.filter(Boolean));
    if (typeof v === "string") {
      const s = v.trim();
      if (!s) return null;
      // Nếu client đã JSON.stringify([...]) thì giữ nguyên (đồng thời xác thực parse được)
      if (s.startsWith("[")) { JSON.parse(s); return s; }
      // Một URL đơn lẻ (http/https hoặc data:)
      if (/^https?:\/\//i.test(s) || s.startsWith("data:")) return JSON.stringify([s]);
      // CSV → mảng
      if (s.includes(",")) {
        const arr = s.split(",").map(t => t.trim()).filter(Boolean);
        return arr.length ? JSON.stringify(arr) : null;
      }
      // Chuỗi đơn khác → gói thành 1 phần tử
      return JSON.stringify([s]);
    }
    return null;
  } catch {
    return null;
  }
}

const admin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const p = await readJson(req);
    if (!p?.title || !p?.user_email) {
      return res.status(400).json({ error: "Missing title/user_email" });
    }

    // CHÚ Ý: dùng owner_phone (đúng tên cột), ảnh đã chuẩn hoá sang TEXT
    const row = {
      title: p.title,
      description: p.description ?? null,
      listing_type: p.listing_type ?? null,
      property_type: p.property_type ?? null,
      area: p.area ?? null,
      price: p.price ?? null,
      rent_per_month: p.rent_per_month ?? null,
      price_per_m2: p.price_per_m2 ?? null,
      province: p.province ?? null,
      district: p.district ?? null,
      ward: p.ward ?? null,
      address: p.address ?? null,
      map_url: p.map_url ?? p.mapUrl ?? null,
      images: imagesText(p.images),          // ✅
      // cover: có thể giữ nếu bạn có cột, còn không thì bỏ
      cover: p.cover ?? null,

      // 👇 đổi về đúng cột trong DB
      owner_phone: p.owner_phone ?? p.contact_phone ?? p.phone ?? null, // ✅

      verification_status: p.verification_status ?? "pending",
      user_email: String(p.user_email).trim().toLowerCase(),           // ✅ đúng cột
      is_verified: !!p.is_verified,
      is_hot: !!p.is_hot,
      status: p.status ?? null,
      badge: p.badge ?? null,
      label: p.label ?? null,
      // created_at / updated_at để DB tự mặc định nếu có default; nếu không truyền từ client
      created_at: p.created_at ?? null,
      updated_at: p.updated_at ?? null,
    };

    const { data, error } = await admin
      .from("properties")
      .insert(row)
      .select("id, title, user_email, created_at")
      .single();

    if (error) {
      console.error("[properties/create] insert error:", error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ ok: true, property: data });
  } catch (e: any) {
    console.error("[properties/create] unhandled:", e?.message || e);
    return res.status(500).json({ error: "Unhandled server error" });
  }
}
