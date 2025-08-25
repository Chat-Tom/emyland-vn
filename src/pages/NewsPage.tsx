import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { NewsService } from "@/services/newsService";
import { NewsArticle } from "@/types/news";
import { Link } from "react-router-dom";

export default function NewsPage() {
  const [loading, setLoading] = useState(false);
  const [pinned, setPinned] = useState<NewsArticle[]>([]);
  const [items, setItems] = useState<NewsArticle[]>([]);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q) return items;
    const s = q.toLowerCase();
    return items.filter(a =>
      (a.title || "").toLowerCase().includes(s) ||
      (a.summary || "").toLowerCase().includes(s) ||
      (a.tags || []).join(" ").toLowerCase().includes(s)
    );
  }, [q, items]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [pin, list] = await Promise.all([
          NewsService.list({ onlyPinned: true }),
          NewsService.list(),
        ]);
        setPinned(pin);
        setItems(list);
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <section className="bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Tin mới</h1>
          <div className="mt-3">
            <input
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="Tìm bài theo tiêu đề, tag…"
              className="w-full md:w-[420px] rounded-md border px-3 py-2"
            />
          </div>
        </div>
      </section>

      <main className="flex-1">
        <div className="container mx-auto px-4 py-6">
          {/* Pinned */}
          {pinned.length > 0 && (
            <>
              <h2 className="text-lg font-semibold mb-3">Nổi bật</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {pinned.map((a) => <NewsCard key={a.id} a={a} />)}
              </div>
            </>
          )}

          {/* List */}
          <h2 className="text-lg font-semibold mb-3">Mới nhất</h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_,i)=>
                <div key={i} className="h-56 rounded-xl bg-gray-100 animate-pulse" />
              )}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-gray-600">Hiện chưa có bài viết.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((a) => <NewsCard key={a.id} a={a} />)}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function NewsCard({ a }: { a: NewsArticle }) {
  const cover = a.imageUrl || "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop";
  const href = `/news/${a.slug}`;
  return (
    <Link to={href} className="group rounded-xl border overflow-hidden bg-white hover:shadow-lg transition">
      <div className="aspect-[16/9] w-full overflow-hidden">
        <img src={cover} className="w-full h-full object-cover group-hover:scale-[1.02] transition" />
      </div>
      <div className="p-3">
        <div className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString("vi-VN")}</div>
        <div className="mt-1 font-semibold line-clamp-2">{a.title}</div>
        {a.summary && <div className="mt-1 text-sm text-gray-600 line-clamp-2">{a.summary}</div>}
        {a.sourceUrl && <div className="mt-2 text-xs text-blue-600">Nguồn: {new URL(a.sourceUrl).hostname}</div>}
      </div>
    </Link>
  );
}
