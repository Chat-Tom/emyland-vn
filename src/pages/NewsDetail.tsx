import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { NewsService } from "@/services/newsService";
import { NewsArticle } from "@/types/news";

export default function NewsDetail() {
  const { slug = "" } = useParams();
  const [a, setA] = useState<NewsArticle | null>(null);

  useEffect(() => {
    (async () => {
      const it = await NewsService.getBySlug(slug);
      setA(it);
    })();
  }, [slug]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          {!a ? (
            <div className="text-gray-600">Không tìm thấy bài viết.</div>
          ) : (
            <>
              <div className="text-sm text-gray-500">
                <Link to="/news" className="hover:underline">← Tin mới</Link>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mt-2">{a.title}</h1>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(a.createdAt).toLocaleString("vi-VN")}
                {a.tags && a.tags.length > 0 && <span> • {a.tags.join(", ")}</span>}
              </div>
              {a.imageUrl && (
                <div className="mt-4 rounded-xl overflow-hidden">
                  <img src={a.imageUrl} className="w-full object-cover" />
                </div>
              )}
              {a.summary && <p className="mt-4 text-gray-700">{a.summary}</p>}

              {/* Nội dung: cho phép HTML đơn giản hoặc plain text */}
              <article className="prose max-w-none mt-4">
                {a.content
                  ? <div dangerouslySetInnerHTML={{ __html: (a.content || "").replace(/\n/g, "<br/>") }} />
                  : <em>Chưa có nội dung chi tiết.</em>}
              </article>

              {a.sourceUrl && (
                <div className="mt-6">
                  <a href={a.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    Đọc nguồn gốc (mở tab mới)
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
