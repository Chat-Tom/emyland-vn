// src/services/newsService.ts
import { supabase } from "@/lib/supabase";

/** Kiểu dữ liệu dùng cho UI (khớp với pages News) */
export type NewsArticle = {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  sourceUrl?: string;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
  content?: string; // HTML hoặc text
  isPinned?: boolean;
  isPublic?: boolean;
};

const LS_KEY = "emyland_news";

/* ---------------------------- LocalStorage ---------------------------- */
function lsGet(): NewsArticle[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}
function lsSave(list: NewsArticle[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* no-op */
  }
}

/* ------------------------------ Helpers ------------------------------ */
const slugify = (s: string) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const toArrayTags = (t: any): string[] => {
  if (Array.isArray(t)) return t.filter(Boolean).map(String);
  if (typeof t === "string") {
    return t
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const firstTruthy = (...vals: any[]) => vals.find((v) => v !== undefined && v !== null && String(v).trim() !== "");

/** Map một hàng từ DB về NewsArticle cho UI */
function mapRow(r: any): NewsArticle {
  const id = String(r?.id ?? r?.slug ?? Date.now());
  const slug = String(r?.slug ?? slugify(r?.title ?? id));
  const createdAt = firstTruthy(r?.published_at, r?.created_at, new Date().toISOString());
  const updatedAt = firstTruthy(r?.updated_at, r?.modified_at);

  return {
    id,
    slug,
    title: r?.title ?? "",
    summary: r?.summary ?? r?.excerpt ?? "",
    imageUrl: firstTruthy(r?.cover_url, r?.image_url, r?.cover),
    sourceUrl: firstTruthy(r?.source_url, r?.url),
    createdAt,
    updatedAt,
    tags: toArrayTags(firstTruthy(r?.tags, r?.tag_list)),
    content: firstTruthy(r?.content, r?.content_html, r?.body),
    isPinned: !!r?.is_pinned,
    isPublic: r?.is_public !== false, // mặc định true nếu không có cột
  };
}

/** Sắp xếp mới → cũ theo published_at/created_at */
function sortNewest(a: NewsArticle, b: NewsArticle) {
  return +new Date(b.createdAt) - +new Date(a.createdAt);
}

const nowIso = () => new Date().toISOString();

/* =================================================================== */
export const NewsService = {
  /**
   * Lấy danh sách tin.
   * @param opts.limit      số lượng (mặc định 20)
   * @param opts.onlyPinned chỉ lấy tin ghim
   * @param opts.q          từ khoá filter thô client-side (tuỳ chọn)
   */
  async list(opts: { limit?: number; onlyPinned?: boolean; q?: string } = {}): Promise<NewsArticle[]> {
    const { limit = 20, onlyPinned = false, q } = opts;

    // Ưu tiên Supabase
    try {
      const query = supabase
        .from("news")
        .select("*")
        // Nếu table có RLS theo is_public/expires_at thì policy sẽ tự lọc;
        // nếu không có, ta vẫn cố gắng ghi điều kiện cho DB phổ biến:
        .eq("is_public", true)
        .limit(limit);

      if (onlyPinned) query.eq("is_pinned", true);

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        let list = data.map(mapRow).sort(sortNewest);
        if (q) {
          const s = q.toLowerCase();
          list = list.filter(
            (a) =>
              (a.title || "").toLowerCase().includes(s) ||
              (a.summary || "").toLowerCase().includes(s) ||
              (a.tags || []).join(" ").toLowerCase().includes(s)
          );
        }
        return list.slice(0, limit);
      }
      console.warn("[NewsService.list] Supabase error → fallback local:", error);
    } catch (e) {
      console.warn("[NewsService.list] Exception → fallback local:", e);
    }

    // Fallback LocalStorage
    let list = lsGet().sort(sortNewest);
    if (onlyPinned) list = list.filter((x) => x.isPinned);
    if (q) {
      const s = q.toLowerCase();
      list = list.filter(
        (a) =>
          (a.title || "").toLowerCase().includes(s) ||
          (a.summary || "").toLowerCase().includes(s) ||
          (a.tags || []).join(" ").toLowerCase().includes(s)
      );
    }
    return list.slice(0, limit);
  },

  /** Lấy chi tiết theo slug (ưu tiên slug; fallback id) */
  async getBySlug(slug: string): Promise<NewsArticle | null> {
    if (!slug) return null;

    try {
      const { data, error } = await supabase.from("news").select("*").eq("slug", slug).maybeSingle();
      if (!error && data) return mapRow(data);
      // Fallback: thử theo id
      const byId = await supabase.from("news").select("*").eq("id", slug).maybeSingle();
      if (!byId.error && byId.data) return mapRow(byId.data);
    } catch (e) {
      console.warn("[NewsService.getBySlug] Exception → fallback local:", e);
    }

    // Local fallback
    const local = lsGet().find((n) => n.slug === slug || n.id === slug);
    return local ?? null;
  },

  /** (Tuỳ chọn) Lấy chi tiết theo id */
  async getById(id: string): Promise<NewsArticle | null> {
    if (!id) return null;

    try {
      const { data, error } = await supabase.from("news").select("*").eq("id", id).maybeSingle();
      if (!error && data) return mapRow(data);
    } catch (e) {
      console.warn("[NewsService.getById] Exception → fallback local:", e);
    }

    const local = lsGet().find((n) => n.id === id);
    return local ?? null;
  },

  /**
   * Tạo bài mới.
   * - Ưu tiên insert cột `cover_url` (schema mới).
   * - Nếu lỗi, fallback qua `image_url` (schema cũ).
   * - Nếu vẫn lỗi, lưu LocalStorage để UI vẫn chạy.
   */
  async create(input: {
    title: string;
    summary?: string;
    imageUrl?: string;
    sourceUrl?: string;
    content?: string;
    tags?: string[] | string;
    isPublic?: boolean;
    isPinned?: boolean;
    createdAt?: string;
    publishedAt?: string; // nếu có
    slug?: string;
    id?: string;
  }): Promise<NewsArticle> {
    const payload: NewsArticle = {
      id: input.id ?? (crypto?.randomUUID?.() ?? String(Date.now())),
      slug: input.slug ?? slugify(input.title),
      title: input.title,
      summary: input.summary ?? "",
      imageUrl: input.imageUrl ?? "",
      sourceUrl: input.sourceUrl ?? "",
      createdAt: input.publishedAt ?? input.createdAt ?? nowIso(),
      updatedAt: nowIso(),
      tags: toArrayTags(input.tags),
      content: input.content ?? "",
      isPinned: !!input.isPinned,
      isPublic: input.isPublic !== false,
    };

    // Supabase trước
    try {
      // Thử với cover_url
      const row1: any = {
        id: payload.id,
        slug: payload.slug,
        title: payload.title,
        summary: payload.summary,
        cover_url: payload.imageUrl,
        source_url: payload.sourceUrl,
        content: payload.content || null,
        tags: (payload.tags || []).join(","),
        is_pinned: payload.isPinned,
        is_public: payload.isPublic,
        created_at: payload.createdAt,
        updated_at: payload.updatedAt,
        published_at: payload.createdAt,
      };
      const ins1 = await supabase.from("news").insert(row1);
      if (!ins1.error) return payload;

      // Fallback image_url (schema cũ)
      const row2 = { ...row1, cover_url: undefined, image_url: payload.imageUrl };
      const ins2 = await supabase.from("news").insert(row2);
      if (!ins2.error) return payload;

      console.warn("[NewsService.create] Insert failed → local fallback:", ins1.error || ins2.error);
    } catch (e) {
      console.warn("[NewsService.create] Exception → local fallback:", e);
    }

    // LocalStorage fallback
    const list = lsGet();
    list.unshift(payload);
    lsSave(list);
    return payload;
  },

  /** Seed local khi rỗng (không đụng Supabase) */
  seedIfEmpty(initial: NewsArticle[]) {
    const cur = lsGet();
    if (!cur.length && initial?.length) {
      lsSave(initial.map((x) => ({ ...x, slug: x.slug || slugify(x.title) })));
    }
  },

  // Expose util cho tooling
  _lsGet: lsGet,
  _lsSave: lsSave,
};
