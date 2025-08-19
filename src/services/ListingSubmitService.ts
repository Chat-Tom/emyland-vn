import { supabase } from "@/lib/supabase";
import type { PropertyListing } from "@utils/storage";

export async function submitToSupabase(p: PropertyListing) {
  // map tối thiểu – tuỳ bảng mà Tom đang dùng
  const payload = {
    id: p.id, // hoặc để DB tự sinh uuid
    title: p.title,
    description: p.description ?? "",
    province: p.location?.province ?? null,
    ward: p.location?.ward ?? null,
    location: [p.location?.address, p.location?.ward, p.location?.province].filter(Boolean).join(", "),
    area: p.area ?? null,
    price: p.listingType === "sell" ? p.price ?? null : null,
    rent_per_month: p.listingType === "rent" ? p.rent_per_month ?? null : null,
    images: p.images ?? [],
    phone: p.contactInfo?.phone ?? null,
    type: p.propertyType ?? null,
    listing_type: p.listingType ?? null,
    is_verified: false,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("properties").insert(payload).select().single();
  if (error) throw error;
  return data;
}
