import React, { useMemo, useState } from "react";

type LogoItem = {
  src: string;
  alt: string;
  href?: string;
  width?: number;
  height?: number;
};

type LogoTickerProps = {
  logos: LogoItem[];
  speed?: "slow" | "normal" | "fast";
  title?: string;
  pauseOnHover?: boolean;
};

const SPEED_MS: Record<NonNullable<LogoTickerProps["speed"]>, number> = {
  slow: 40000,
  normal: 28000,
  fast: 18000,
};

function LogoCell({ item }: { item: LogoItem }) {
  const [broken, setBroken] = useState(false);
  const showImg = !!item.src && !broken;

  // Nhỏ gọn, không bo tròn, không viền dày
  const boxW = 180;
  const boxH = 56;

  const content = showImg ? (
    <img
      src={item.src}
      alt={item.alt}
      width={item.width || 140}
      height={item.height || 40}
      className="object-contain max-h-10"
      loading="lazy"
      onError={() => setBroken(true)}
    />
  ) : (
    <span className="text-xs font-medium text-gray-500">MỜI QUẢNG CÁO</span>
  );

  return (
    <a
      href={item.href || "#"}
      target={item.href ? "_blank" : undefined}
      rel={item.href ? "noopener noreferrer" : undefined}
      className="flex items-center justify-center shrink-0 px-3 py-2 bg-white"
      style={{ width: boxW, height: boxH }}
      aria-label={item.alt || "Sponsor"}
    >
      {content}
    </a>
  );
}

export default function LogoTicker({
  logos,
  speed = "normal",
  title = "Đối tác tài trợ & thương hiệu tin cậy",
  pauseOnHover = true,
}: LogoTickerProps) {
  const [paused, setPaused] = useState(false);

  const padded = useMemo(() => {
    const TARGET_MIN = 8;
    const MAX_EMPTY = 3;
    const safe = Array.isArray(logos) ? logos.filter(Boolean) : [];
    const lack = Math.max(0, TARGET_MIN - safe.length);
    const need = Math.min(MAX_EMPTY, lack);
    return [...safe, ...Array(need).fill({ src: "", alt: "Ad slot" })];
  }, [logos]);

  const items = useMemo(() => [...padded, ...padded], [padded]);
  const duration = SPEED_MS[speed];

  return (
    <section className="w-full bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-2">
          <h3 className="text-sm sm:text-base font-semibold text-gray-800">{title}</h3>
        </div>

        <div className="relative overflow-hidden bg-white">
          <div
            className="flex w-max gap-4 py-2 will-change-transform"
            style={{
              animation: `ticker ${duration}ms linear infinite`,
              animationPlayState: paused ? "paused" : "running",
            }}
            onMouseEnter={() => pauseOnHover && setPaused(true)}
            onMouseLeave={() => pauseOnHover && setPaused(false)}
          >
            {items.map((logo, idx) => (
              <div key={idx} className="shrink-0">
                <LogoCell item={logo} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
