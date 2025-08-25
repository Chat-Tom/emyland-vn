// src/services/newsService.ts
import { supabase } from "./supabaseClient";

/** Bản ghi tin tức dùng cho UI */
export type NewsItem = {
  id: string;
  title: string;
  summary?: string;
  image?: string;       // map từ cover_url / image_url
  sourceUrl?: string;   // map từ source_url
  createdAt: string;    // map từ created_at
  contentHtml?: string; // map từ content (nếu cần hiển thị chi tiết)
};

const KEY = "emyland_news";

/* ---------- LocalStorage fallback ---------- */
const getLocal = (): NewsItem[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
const saveLocal = (list: NewsItem[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
};

/* ---------- Utils ---------- */
const mapRowToNews = (r: any): NewsItem => ({
  id: r?.id ?? r?.slug ?? String(r?.created_at ?? Date.now()),
  title: r?.title ?? "",
  summary: r?.summary ?? r?.excerpt ?? "",
  // Ưu tiên cover_url (đúng schema hiện tại), fallback image_url/cover
  image: r?.cover_url ?? r?.image_url ?? r?.cover ?? "",
  sourceUrl: r?.source_url ?? r?.url ?? "",
  createdAt: r?.created_at ?? new Date().toISOString(),
  contentHtml: r?.content ?? r?.content_html ?? "",
});

const nowIso = () => new Date().toISOString();

/* =================================================================== */
export const NewsService = {
  /**
   * Lấy danh sách tin. Ưu tiên đọc Supabase, nếu lỗi sẽ rơi về LocalStorage.
   * Mặc định sort theo created_at desc và giới hạn số lượng.
   */
  async list(limit = 20): Promise<NewsItem[]> {
    // Ưu tiên Supabase nếu có client
    if (supabase?.from) {
      // Nếu RLS đã cấu hình is_public/expires_at thì chỉ cần select *
      // (các policy sẽ tự lọc). Nếu muốn lọc client-side, có thể
      // bổ sung .eq('is_public', true) / .gt('expires_at', now) tuỳ nhu cầu.
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data)) {
        return data.map(mapRowToNews);
      }
      console.warn("[NewsService.list] Supabase error -> local fallback:", error);
    }

    // Fallback LocalStorage
    return getLocal()
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, limit);
  },

  /**
   * Lấy chi tiết 1 tin theo id (nếu Supabase thất bại sẽ dùng local).
   */
  async getById(id: string): Promise<NewsItem | null> {
    if (!id) return null;

    if (supabase?.from) {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!error && data) return mapRowToNews(data);
    }

    // Local fallback
    const found = getLocal().find((n) => n.id === id);
    return found ?? null;
  },

  /**
   * Tạo bài mới. Giữ nguyên hành vi cũ:
   * - Ưu tiên ghi Supabase (đúng schema: cover_url)
   * - Nếu lỗi (ví dụ khác schema), thử lại bằng image_url (fallback)
   * - Nếu vẫn lỗi, rơi về LocalStorage
   */
  async create(
    item: Omit<NewsItem, "id" | "createdAt"> & {
      id?: string;
      createdAt?: string;
      // các field mở rộng, tuỳ table có cột mới dùng (không gửi nếu undefined)
      isPublic?: boolean;
      isPinned?: boolean;
      expiresAt?: string | null;
    }
  ): Promise<NewsItem> {
    const payload: NewsItem = {
      id: item.id ?? (crypto?.randomUUID?.() ?? String(Date.now())),
      createdAt: item.createdAt ?? nowIso(),
      title: item.title,
      summary: item.summary ?? "",
      image: item.image ?? "",
      sourceUrl: item.sourceUrl ?? "",
      contentHtml: item.contentHtml ?? "",
    };

    if (supabase?.from) {
      // --- Thử insert với cover_url (schema hiện tại) ---
      let firstError: any = null;
      try {
        const row: any = {
          id: payload.id,
          title: payload.title,
          summary: payload.summary,
          cover_url: payload.image,     // <— chuẩn hiện tại
          source_url: payload.sourceUrl,
          content: payload.contentHtml || null,
          created_at: payload.createdAt,
        };
        if (typeof item.isPublic === "boolean") row.is_public = item.isPublic;
        if (typeof item.isPinned === "boolean") row.is_pinned = item.isPinned;
        if (item.expiresAt !== undefined) row.expires_at = item.expiresAt;

        const { error } = await supabase.from("news").insert(row);
        if (!error) return payload;
        firstError = error;
      } catch (e) {
        firstError = e;
      }

      // --- Fallback: insert với image_url (cho các DB cũ) ---
      try {
        const row: any = {
          id: payload.id,
          title: payload.title,
          summary: payload.summary,
          image_url: payload.image,     // <— fallback
          source_url: payload.sourceUrl,
          content: payload.contentHtml || null,
          created_at: payload.createdAt,
        };
        if (typeof item.isPublic === "boolean") row.is_public = item.isPublic;
        if (typeof item.isPinned === "boolean") row.is_pinned = item.isPinned;
        if (item.expiresAt !== undefined) row.expires_at = item.expiresAt;

        const { error } = await supabase.from("news").insert(row);
        if (!error) return payload;
      } catch {
        /* noop */
      }

      console.warn("[NewsService.create] Insert failed -> local fallback. First error:", firstError);
    }

    // Fallback LocalStorage (giữ y nguyên hành vi cũ)
    const list = getLocal();
    list.unshift(payload);
    saveLocal(list);
    return payload;
  },

  /** Seed vài bài mẫu cho LocalStorage nếu đang rỗng (không đụng Supabase) */
  seedIfEmpty(initial: NewsItem[]) {
    const list = getLocal();
    if (!list.length && initial?.length) {
      saveLocal(initial);
    }
  },

  // Expose để admin/tooling có thể thao tác trực tiếp local khi cần
  _saveLocal: saveLocal,
  _getLocal: getLocal,
};
