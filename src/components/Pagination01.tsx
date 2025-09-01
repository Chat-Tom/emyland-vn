import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import clsx from "clsx";

type Props = {
  total: number;          // tổng số tin (thường chỉ có ở trang 1)
  pageSize?: number;      // default 12
  maxButtons?: number;    // default 9
  className?: string;
};

export default function Pagination01({
  total,
  pageSize = 12,
  maxButtons = 9,
  className,
}: Props) {
  const navigate = useNavigate();
  const { search, pathname } = useLocation();

  const sp = new URLSearchParams(search);
  const current = Math.max(1, Number(sp.get("page") || 1));

  // Khóa cache theo route (mỗi danh sách 1 cache riêng)
  const cacheKey = useMemo(() => `emyland:paging:${pathname}`, [pathname]);

  // Tổng trang từ props (nếu API có trả)
  const pagesFromProps = Math.max(
    0,
    Math.ceil((Number(total) || 0) / pageSize)
  );

  // State đọc/lắng nghe cache (để không bị "return null" do đọc sớm)
  const [cachedPages, setCachedPages] = useState<number | undefined>(undefined);

  // Ghi cache khi nhận được total hợp lệ (thường ở trang 1)
  useEffect(() => {
    if (pagesFromProps > 1) {
      try {
        localStorage.setItem(cacheKey, String(pagesFromProps));
        sessionStorage.setItem(cacheKey, String(pagesFromProps));
        setCachedPages(pagesFromProps);
      } catch {}
    }
  }, [pagesFromProps, cacheKey]);

  // Đọc cache khi vào trang 2,3… (API không trả total)
  useEffect(() => {
    const readCache = () => {
      try {
        const v =
          sessionStorage.getItem(cacheKey) || localStorage.getItem(cacheKey);
        const n = v ? parseInt(v, 10) : NaN;
        if (Number.isFinite(n) && n > 1) setCachedPages(n);
      } catch {}
    };
    readCache();

    // Thử đọc lại một nhịp ngắn để bắt kịp pager phía trên vừa ghi cache
    const t1 = window.setTimeout(readCache, 80);
    const t2 = window.setTimeout(readCache, 300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [cacheKey, search]);

  // Tổng trang thực dùng
  const totalPages =
    pagesFromProps > 1 ? pagesFromProps : cachedPages || 0;

  const go = (p: number) => {
    // Khi chưa biết tổng, vẫn cho điều hướng hợp lệ
    const safeTotal = totalPages > 0 ? totalPages : Math.max(current + 1, 2);
    const next = Math.min(Math.max(1, p), safeTotal);
    const q = new URLSearchParams(search);
    q.set("page", String(next));
    navigate(`${pathname}?${q.toString()}`, { replace: false });
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
  };

  // Tính dải nút (nếu chưa biết tổng, hiển thị dải quanh current + dấu …)
  const effectiveTotal = totalPages > 0 ? totalPages : Math.max(current + 3, 5);
  const pages: (number | "...")[] = [];
  if (effectiveTotal <= maxButtons) {
    for (let i = 1; i <= effectiveTotal; i++) pages.push(i);
  } else {
    const half = Math.floor((maxButtons - 3) / 2); // chừa chỗ 1 … 1
    const start = Math.max(2, current - half);
    const end = Math.min(effectiveTotal - 1, current + half);

    pages.push(1);
    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < effectiveTotal - 1) pages.push("...");
    pages.push(effectiveTotal);
  }

  const fmt = (n: number) => String(n).padStart(2, "0");

  return (
    <nav
      data-paging
      className={clsx("flex items-center justify-center gap-1 mt-6", className)}
    >
      <Button variant="outline" size="sm" onClick={() => go(1)} disabled={current === 1}>
        «
      </Button>
      <Button variant="outline" size="sm" onClick={() => go(current - 1)} disabled={current === 1}>
        ‹
      </Button>

      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`dots-${idx}`} className="px-2 text-gray-500">…</span>
        ) : (
          <Button
            key={p}
            variant={p === current ? "default" : "outline"}
            size="sm"
            onClick={() => go(p)}
            aria-current={p === current ? "page" : undefined}
          >
            {fmt(p)}
          </Button>
        )
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => go(current + 1)}
        // khi chưa biết tổng, vẫn cho next
        disabled={totalPages > 0 ? current === totalPages : false}
      >
        ›
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => go(totalPages > 0 ? totalPages : current + 1)}
        disabled={totalPages > 0 ? current === totalPages : false}
      >
        »
      </Button>
    </nav>
  );
}
