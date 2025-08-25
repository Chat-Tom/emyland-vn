export type NewsArticle = {
  id: string;                // uuid
  slug: string;              // duy nhất, dùng cho /news/:slug
  title: string;
  summary?: string;
  content?: string;          // nội dung thuần văn bản hoặc HTML đơn giản
  imageUrl?: string;
  sourceUrl?: string;        // link gốc (nếu là tổng hợp)
  tags?: string[];
  isPublished: boolean;
  pinned?: boolean;          // ghim nóng
  createdAt: string;         // ISO
  updatedAt?: string;
  expiresAt?: string | null; // nếu có, ẩn sau ngày này
  author?: {
    id?: string;
    name?: string;
  };
};
