import React from "react";
import { Button } from "@/components/ui/button";
import { Megaphone } from "lucide-react";

type AdPromoBarProps = {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  onCtaClick?: () => void;
};

export default function AdPromoBar({
  title = "Nền tảng nhà đất chính chủ",
  subtitle = "Đăng tin miễn phí • Tiếp cận khách thật • Duyệt nhanh",
  ctaText = "Đăng tin ngay",
  onCtaClick,
}: AdPromoBarProps) {
  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-r from-[#FDFBFF] via-[#F7FAFF] to-[#FFFDF7] shadow-sm">
          {/* décor */}
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#FFEDD5] opacity-60 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -right-10 h-44 w-44 rounded-full bg-[#DBEAFE] opacity-60 blur-2xl" />

          <div className="relative flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white/80 p-2 shadow-sm ring-1 ring-black/5">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold leading-tight">{title}</h3>
                <p className="text-sm text-neutral-600">{subtitle}</p>
              </div>
            </div>

            <Button
              className="mt-2 w-full sm:mt-0 sm:w-auto"
              onClick={onCtaClick}
            >
              {ctaText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
