import React, { useMemo } from "react";

type LogoItem = {
  src: string;
  alt: string;
  href?: string;
  width?: number;
  height?: number;
};

type LogoTickerProps = {
  logos: LogoItem[];
  /** "slow" | "normal" | "fast" */
  speed?: "slow" | "normal" | "fast";
  /** Tiêu đề bên trái */
  title?: string;
  /** Tạm dừng khi hover */
  pauseOnHover?: boolean;
};

const SPEED_MS: Record<NonNullable<LogoTickerProps["speed"]>, number> = {
  slow: 40_000,
  normal: 28_000,
  fast: 18_000,
};

export default function LogoTicker({
  logos,
  speed = "normal",
  title = "Đối tác & thương hiệu tin cậy",
  pauseOnHover = true,
}: LogoTickerProps) {
  // lặp mảng để chạy marquee mượt
  const items = useMemo(() => [...logos, ...logos], [logos]);
  const duration = SPEED_MS[speed];

  return (
    <section className="w-full bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800">
            {title}
          </h3>
          {/* ✅ ĐÃ BỎ dòng “Trượt nhẹ để xem thêm • Dừng khi rê chuột” */}
        </div>

        <div className={`relative overflow-hidden rounded-2xl border border-gray-100 bg-white`}>
          <div
            className={`flex w-max gap-6 py-4 will-change-transform ${
              pauseOnHover ? "hover:[animation-play-state:paused]" : ""
            }`}
            style={{
              animation: `ticker ${duration}ms linear infinite`,
            }}
          >
            {items.map((logo, idx) => (
              <a
                key={idx}
                href={logo.href || "#"}
                target={logo.href ? "_blank" : undefined}
                rel={logo.href ? "noopener noreferrer" : undefined}
                className="flex items-center justify-center shrink-0 rounded-xl px-5 py-3 bg-gradient-to-br from-white to-gray-50 border border-gray-100 hover:shadow-sm transition"
                style={{ width: 220, height: 72 }}
                aria-label={logo.alt}
              >
                {logo.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logo.src}
                    alt={logo.alt}
                    width={logo.width || 180}
                    height={logo.height || 60}
                    className="object-contain max-h-14"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-sm font-semibold text-gray-600">
                    MỜI QUẢNG CÁO
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* keyframes cho ticker */}
      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
