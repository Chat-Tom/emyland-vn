import { useEffect, useState } from "react";
import { NewsService } from "@/services/newsService";
import { NewsArticle } from "@/types/news";

export default function NewsAdminPanel() {
  const [list, setList] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<NewsArticle | null>(null);

  const load = async () => {
    setLoading(true);
    try { setList(await NewsService.list({ includeUnpublished: true })); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      title: String(fd.get("title") || ""),
      summary: String(fd.get("summary") || ""),
      content: String(fd.get("content") || ""),
      imageUrl: String(fd.get("imageUrl") || ""),
      sourceUrl: String(fd.get("sourceUrl") || ""),
      tags: String(fd.get("tags") || "").split(",").map(s => s.trim()).filter(Boolean),
      isPublished: !!fd.get("isPublished"),
      pinned: !!fd.get("pinned"),
      expiresAt: fd.get("expiresDays")
        ? new Date(Date.now() + Number(fd.get("expiresDays"))*864e5).toISOString()
        : null
    } as Partial<NewsArticle> & { isPublished: boolean; pinned: boolean; };

    if (editing) await NewsService.update(editing.id, data);
    else await NewsService.create({ ...data, author: undefined } as any);

    setEditing(null);
    (e.target as HTMLFormElement).reset();
    await load();
  };

  const startEdit = (a: NewsArticle) => {
    setEditing(a);
    setTimeout(() => {
      const f = document.querySelector<HTMLFormElement>("#news-form");
      if (!f) return;
      (f.elements.namedItem("title") as HTMLInputElement).value = a.title || "";
      (f.elements.namedItem("summary") as HTMLInputElement).value = a.summary || "";
      (f.elements.namedItem("imageUrl") as HTMLInputElement).value = a.imageUrl || "";
      (f.elements.namedItem("sourceUrl") as HTMLInputElement).value = a.sourceUrl || "";
      (f.elements.namedItem("tags") as HTMLInputElement).value = (a.tags || []).join(", ");
      (f.elements.namedItem("content") as HTMLTextAreaElement).value = a.content || "";
      (f.elements.namedItem("isPublished") as HTMLInputElement).checked = !!a.isPublished;
      (f.elements.namedItem("pinned") as HTMLInputElement).checked = !!a.pinned;
    }, 0);
  };

  const remove = async (id: string) => {
    if (!confirm("Xoá bài này?")) return;
    await NewsService.remove(id);
    await load();
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Tin tức • Viết bài</h3>

      <form id="news-form" onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border rounded-lg bg-white">
        <input name="title" placeholder="Tiêu đề *" required className="border rounded px-3 py-2 md:col-span-2" />
        <input name="summary" placeholder="Tóm tắt ngắn" className="border rounded px-3 py-2 md:col-span-2" />
        <input name="imageUrl" placeholder="Ảnh cover URL" className="border rounded px-3 py-2" />
        <input name="sourceUrl" placeholder="Nguồn (URL gốc nếu có)" className="border rounded px-3 py-2" />
        <input name="tags" placeholder="tag1, tag2, ..." className="border rounded px-3 py-2 md:col-span-2" />
        <textarea name="content" placeholder="Nội dung (có thể nhập HTML đơn giản)" rows={8} className="border rounded px-3 py-2 md:col-span-2" />
        <div className="flex items-center gap-4 md:col-span-2">
          <label className="flex items-center gap-2"><input type="checkbox" name="isPublished" defaultChecked /> Công khai</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="pinned" /> Ghim nổi bật</label>
          <div className="flex items-center gap-2">
            <span>Hết hạn sau</span>
            <input type="number" name="expiresDays" min={0} placeholder="(tuỳ chọn)" className="w-24 border rounded px-2 py-1" />
            <span>ngày</span>
          </div>
          <div className="flex-1 text-right">
            {editing && <button type="button" onClick={()=>setEditing(null)} className="mr-2 px-3 py-2 border rounded">Huỷ</button>}
            <button className="px-4 py-2 rounded bg-blue-600 text-white">{editing ? "Cập nhật" : "Đăng bài"}</button>
          </div>
        </div>
      </form>

      <div className="border rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b bg-gray-50 text-sm">Danh sách bài</div>
        {loading ? (
          <div className="p-3 text-gray-600">Đang tải…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50">
                <th className="p-2">Tiêu đề</th>
                <th className="p-2">Trạng thái</th>
                <th className="p-2">Ngày</th>
                <th className="p-2 w-40"></th>
              </tr>
            </thead>
            <tbody>
              {list.map(a => (
                <tr key={a.id} className="border-t">
                  <td className="p-2">{a.title}</td>
                  <td className="p-2">
                    {a.isPublished ? "Công khai" : "Nháp"}{a.pinned ? " • Ghim" : ""}
                    {a.expiresAt ? ` • Hết hạn: ${new Date(a.expiresAt).toLocaleDateString("vi-VN")}` : ""}
                  </td>
                  <td className="p-2">{new Date(a.createdAt).toLocaleString("vi-VN")}</td>
                  <td className="p-2 text-right">
                    <button className="px-2 py-1 border rounded mr-2" onClick={()=>startEdit(a)}>Sửa</button>
                    <button className="px-2 py-1 border rounded text-red-600" onClick={()=>remove(a.id)}>Xoá</button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td className="p-3 text-gray-600" colSpan={4}>Chưa có bài viết.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
