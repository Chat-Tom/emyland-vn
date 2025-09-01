// src/utils/seo.ts
export function setMetaTags({
  title,
  description,
  canonical,
}: { title?: string; description?: string; canonical?: string }) {
  if (title) document.title = title;

  if (description) {
    let m = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.name = "description";
      document.head.appendChild(m);
    }
    m.content = description;
  }

  if (canonical) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonical;
  }
}
