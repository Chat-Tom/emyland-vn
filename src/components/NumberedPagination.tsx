import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  page: number;                 // trang hiện tại (>=1)
  totalPages: number;           // tổng số trang (>=1)
  onPageChange: (p: number) => void;
  className?: string;
  maxButtons?: number;          // số nút số trang hiển thị (mặc định 7)
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function NumberedPagination({
  page,
  totalPages,
  onPageChange,
  className = "",
  maxButtons = 7,
}: Props) {
  if (totalPages <= 1) return null;

  const go = (p: number) => onPageChange(clamp(p, 1, totalPages));

  // Tính dải nút số trang (cửa sổ trượt)
  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, page - half);
  let end = Math.min(totalPages, start + maxButtons - 1);
  if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);

  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Button variant="outline" size="sm" onClick={() => go(page - 1)} disabled={page <= 1}>
        Trước
      </Button>

      {start > 1 && (
        <>
          <Button variant="outline" size="sm" onClick={() => go(1)}>1</Button>
          {start > 2 && <span className="px-1 text-gray-500">…</span>}
        </>
      )}

      {pages.map((p) => (
        <Button
          key={p}
          size="sm"
          variant={p === page ? "default" : "outline"}
          onClick={() => go(p)}
          className={p === page ? "bg-blue-600 text-white" : ""}
          aria-current={p === page ? "page" : undefined}
          aria-label={p === page ? `Trang ${p}, hiện tại` : `Tới trang ${p}`}
        >
          {p}
        </Button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-gray-500">…</span>}
          <Button variant="outline" size="sm" onClick={() => go(totalPages)}>
            {totalPages}
          </Button>
        </>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
      >
        Sau
      </Button>
    </div>
  );
}
