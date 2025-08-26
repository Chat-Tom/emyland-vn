import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import clsx from "clsx";

type Props = {
  total: number;          // tổng số tin
  pageSize?: number;      // số tin / trang (mặc định 12)
  maxButtons?: number;    // số nút hiển thị tối đa (mặc định 9)
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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) return null;

  const go = (p: number) => {
    const q = new URLSearchParams(search);
    q.set("page", String(p));
    navigate(`${pathname}?${q.toString()}`, { replace: false });
    // cuộn lên đầu danh sách
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Tính dải nút (có ... khi nhiều trang)
  const pages: (number | "...")[] = [];
  if (totalPages <= maxButtons) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    const half = Math.floor((maxButtons - 3) / 2); // chừa chỗ cho 1 ... 1
    const start = Math.max(2, current - half);
    const end = Math.min(totalPages - 1, current + half);

    pages.push(1);
    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("...");
    pages.push(totalPages);
  }

  const fmt = (n: number) => String(n).padStart(2, "0");

  return (
    <nav className={clsx("flex items-center justify-center gap-1 mt-6", className)}>
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
        disabled={current === totalPages}
      >
        ›
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => go(totalPages)}
        disabled={current === totalPages}
      >
        »
      </Button>
    </nav>
  );
}
