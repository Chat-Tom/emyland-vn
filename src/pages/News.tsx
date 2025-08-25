// src/pages/News.tsx
import { useEffect, useState } from "react";
import { NEWS_SEED } from "@/data/news-seed";

type News = {
  title: string; source: string; sourceUrl: string;
  summary: string; imageUrl?: string; tags?: string[];
  publishedAt?: string; expiresDays?: number;
};

export default function NewsPage() {
  const [items, setItems] = useState<News[]>([]);

  useEffect(() => {
    // TODO: nếu đã có Supabase -> fetch từ bảng `news` (mục 4)
    setItems(NEWS_SEED);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">Tin mới</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((n, i) => (
            <article key={i} className="rounded-xl border p-4 bg-white shadow-sm">
              {n.imageUrl ? (
                <img src={n.imageUrl} alt="" className="w-full h-40 object-cover rounded-lg mb-3" />
              ) : null}
              <h2 className="text-lg font-semibold">{n.title}</h2>
              <p className="text-gray-600 mt-1">{n.summary}</p>
              <div className="mt-3 text-sm text-gray-500">
                Nguồn: <a className="underline" href={n.sourceUrl} target="_blank" rel="noreferrer">{n.source}</a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
