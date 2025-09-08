// D:\emyland04082025\api\properties\create.ts
export const config = { runtime: "nodejs" };
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const norm = (v:any)=> v==null ? null : (typeof v==='object' ? JSON.stringify(v) : String(v));

export default async function handler(req:any,res:any){
  if (req.method !== "POST") return res.status(405).json({ error:"Method not allowed" });
  const p = req.body || {};
  if (!p?.title || !p?.user_email) return res.status(400).json({ error:"Missing title/user_email" });

  let owner_id: string | null = null;
  try {
    const { data: u } = await admin.from("app_users").select("id").eq("email", p.user_email).maybeSingle();
    owner_id = u?.id ?? null;
  } catch {}

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
    user_email: p.user_email,     // <-- cột thật trong DB
    owner_id,
    is_hot: !!p.is_hot,
    is_verified: !!p.is_verified,
    status: p.status ?? null,
    badge: p.badge ?? null,
    label: p.label ?? null,
  };

  const { data, error } = await admin.from("properties").insert(row).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok:true, property:data });
}
