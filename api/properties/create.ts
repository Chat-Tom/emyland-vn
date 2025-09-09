// api/properties/create.ts
export const config = { runtime: "nodejs" };
import { createClient } from "@supabase/supabase-js";

// đọc JSON body an toàn
async function readJson(req: any) {
  if (req?.body && typeof req.body === "object") return req.body;
  if (req?.body && typeof req.body === "string") { try { return JSON.parse(req.body); } catch {} }
  const raw: string = await new Promise((resolve) => {
    let s = ""; req.on?.("data",(c:any)=>s+=c); req.on?.("end",()=>resolve(s)); setTimeout(()=>resolve(""),0);
  });
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
const norm = (v:any)=> v==null ? null : (typeof v==='object' ? JSON.stringify(v) : String(v));

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

export default async function handler(req:any,res:any){
  try{
    if (req.method !== "POST") return res.status(405).json({ error:"Method not allowed" });

    const p = await readJson(req);
    if (!p?.title || !p?.user_email) return res.status(400).json({ error:"Missing title/user_email" });

    // 👉 KHÔNG gửi owner_id để né FK
    const row = {
      title: p.title,
      description: p.description ?? null,
      listing_type: p.listing_type ?? null,
      property_type: p.property_type ?? null,
      area: p.area ?? null,
      price: p.price ?? null,
      rent_per_month: p.rent_per_month ?? null,
      price_per_m2: p.price_per_m2 ?? null,
      bedrooms: p.bedrooms ?? p.bedroom_count ?? null,
      bathrooms: p.bathrooms ?? p.bathroom_count ?? null,
      province: p.province ?? null,
      district: p.district ?? null,
      ward: p.ward ?? null,
      address: p.address ?? null,
      location: p.location ?? null,
      images: norm(p.images),
      cover: p.cover ?? null,
      contact_phone: p.contact_phone ?? p.phone ?? null,
      verification_status: p.verification_status ?? null,
      user_email: p.user_email,   // cột thật trong DB
      is_hot: !!p.is_hot,
      is_verified: !!p.is_verified,
      status: p.status ?? null,
      badge: p.badge ?? null,
      label: p.label ?? null
    };

    const { data, error } = await admin
      .from("properties")
      .insert(row)
      .select("id,title,user_email,created_at")
      .single();

    if (error) {
      console.error("[properties/create] insert error:", error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ ok:true, property:data });
  }catch(e:any){
    console.error("[properties/create] unhandled:", e?.message);
    return res.status(500).json({ error:"Unhandled server error" });
  }
}
