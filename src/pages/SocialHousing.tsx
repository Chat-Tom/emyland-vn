import React, { useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import PropertyCard from "@/components/PropertyCard";
import { StorageManager } from "@utils/storage";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ListingType = "all" | "sell" | "rent";

function isSocialHousing(p: any) {
  const t = `${p?.propertyType || p?.type || ""}`.toLowerCase();
  return (
    t.includes("social_housing") ||
    t.includes("nha o xa hoi") ||
    t.includes("nha_o_xa_hoi") ||
    t.includes("noxh") ||
    t.includes("social")
  );
}

export default function SocialHousing() {
  const [mode, setMode] = useState<ListingType>("all");

  const all = useMemo(() => {
    // bạn có thể ghép thêm nguồn DB tại đây nếu cần
    const props = StorageManager.getAllProperties();
    return props.filter(isSocialHousing);
  }, []);

  const data = useMemo(() => {
    if (mode === "all") return all;
    return all.filter((p: any) => {
      const lt: "sell" | "rent" | undefined =
        p?.listingType ?? (typeof p?.rent_per_month === "number" ? "rent" : "sell");
      return lt === mode;
    });
  }, [all, mode]);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Thanh 3 nút giống trang chính, highlight mục này */}
        <div className="mb-5 flex flex-wrap gap-3">
          <a href="/" className="px-4 py-2 rounded-xl border bg-white hover:bg-amber-50">Nhà đất bán</a>
          <a href="/?mode=rent" className="px-4 py-2 rounded-xl border bg-white hover:bg-amber-50">Nhà đất cho thuê</a>
          <span className="px-4 py-2 rounded-xl border bg-emerald-600 text-white shadow">
            Nhà ở xã hội
          </span>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Nhà ở xã hội</h1>

          <Tabs value={mode} onValueChange={(v) => setMode(v as ListingType)}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="all">Tất cả</TabsTrigger>
              <TabsTrigger value="sell">Bán</TabsTrigger>
              <TabsTrigger value="rent">Cho thuê</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {data.length === 0 ? (
          <div className="text-gray-600">Chưa có tin phù hợp.</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((p: any) => (
              <PropertyCard key={p.id} property={p as any} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
