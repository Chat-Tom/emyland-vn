// src/pages/NewsDetail.tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { NewsService, type NewsArticle } from "@/services/newsService";

export default function NewsDetail() {
  const { slug = "" } = useParams();
  const [a, setA] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Khi đổi bài → cuộn lên đầu để trải nghiệm đọc tốt
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const it = await NewsService.getBySlug(slug);
        setA(it || null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const toHost = (url?: string) => {
    try {
      return url ? new URL(url).hostname.replace(/^www\./, "") : "";
    } catch {
      return "";
    }
  };

  const renderDateTime = (d?: any) => {
    const dt = d ? new Date(d) : undefined;
    return dt && !Number.isNaN(dt.getTime()) ? dt.toLocaleString("vi-VN") : "";
  };

  const renderContent = (raw?: string) => {
    if (!raw) return null;
    const looksHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
    const html = looksHtml ? raw : raw.replace(/\n/g, "<br/>");
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const sourceHost = toHost(a?.sourceUrl);
  const isExternalSource = !!sourceHost && !/(^|\.)emyland\.vn$/i.test(sourceHost);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          {/* Breadcrumb */}
          <div className="text-sm text-gray-500">
            <Link to="/news" className="hover:underline">
              ← Tin mới
            </Link>
          </div>

          {loading ? (
            <div className="mt-4 space-y-4">
              <div className="h-8 w-3/4 rounded bg-gray-100 animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-gray-100 animate-pulse" />
              <div className="aspect-[16/9] w-full rounded-xl bg-gray-100 animate-pulse" />
              <div className="h-24 w-full rounded bg-gray-100 animate-pulse" />
            </div>
          ) : !a ? (
            <div className="mt-4 text-gray-600">Không tìm thấy bài viết.</div>
          ) : (
            <>
              {/* Tiêu đề */}
              <h1 className="text-2xl md:text-3xl font-bold mt-2">{a.title}</h1>

              {/* Meta */}
              <div className="text-xs text-gray-500 mt-1">
                {renderDateTime(a.createdAt || a.updatedAt)}
                {a.tags && a.tags.length > 0 && <span> • {a.tags.join(", ")}</span>}
                {a.sourceUrl && sourceHost && (
                  <span>
                    {" "}
                    • Nguồn:{" "}
                    <a
                      href={a.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline hover:opacity-80"
                      title={`Mở bài gốc trên ${sourceHost}`}
                    >
                      {sourceHost}
                    </a>
                  </span>
                )}
              </div>

              {/* Ảnh cover (nếu có) */}
              {a.imageUrl && (
                <div className="mt-4 rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <img
                    src={a.imageUrl}
                    className="w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Tóm tắt (nếu có) */}
              {a.summary && <p className="mt-4 text-gray-700">{a.summary}</p>}

              {/* Nội dung */}
              <article className="prose max-w-none mt-4">
                {a.content ? renderContent(a.content) : <em>Chưa có nội dung chi tiết.</em>}
              </article>

              {/* Link nguồn gốc (mở tab mới) */}
              {a.sourceUrl && (
                <div className="mt-6">
                  <a
                    href={a.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                    title={sourceHost ? `Mở bài gốc trên ${sourceHost}` : "Mở bài gốc"}
                  >
                  </a>
                </div>
              )}

              {/* Đính chính cho bài trích nguồn ngoài — host là link tới bài gốc */}
              {isExternalSource && (
                <p className="mt-6 text-sm italic text-blue-600">
                  Bài viết này được nền tảng bất động sản chính chủ{" "}
                  <a
                    href="https://emyland.vn"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold hover:underline"
                    title="Truy cập EmyLand.vn"
                  >
                    EmyLand
                  </a>{" "}
                  trích dẫn từ nguồn{" "}
                  <a
                    href={a.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:opacity-80"
                    title={`Mở bài gốc trên ${sourceHost}`}
                  >
                    {sourceHost}
                  </a>
                  .
                </p>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
