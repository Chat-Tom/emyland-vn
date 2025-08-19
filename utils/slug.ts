// src/utils/slug.ts
export function slugify(s: string) {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // bỏ dấu
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
