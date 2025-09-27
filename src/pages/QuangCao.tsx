import { Link } from "react-router-dom";

export default function QuangCao() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <section className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-3xl border bg-white/90 shadow-sm p-6 md:p-10">
          {/* Banner SVG đơn giản, tải cực nhanh */}
          <div className="mx-auto mb-8 h-40 w-full max-w-2xl">
            <svg viewBox="0 0 900 200" className="h-full w-full">
              <defs>
                <linearGradient id="g1" x1="0" x2="1">
                  <stop offset="0" stopColor="#f59e0b" />
                  <stop offset="1" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="900" height="200" fill="url(#g1)" rx="24" />
              <g fontFamily="Inter, ui-sans-serif" textAnchor="middle" fill="white">
                <text x="450" y="95" fontSize="42" fontWeight="800">Đặt Banner Tại Đây</text>
                <text x="450" y="140" fontSize="22" opacity="0.95">
                  Thu hút khách hàng • Tăng nhận diện thương hiệu
                </text>
              </g>
            </svg>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">
            Mời đối tác quảng cáo cùng EmyLand
          </h1>
          <p className="mt-3 text-center text-gray-600">
            Vị trí hiển thị nổi bật trên trang chủ, logo chạy liên tục trong dải thương hiệu.
            Phù hợp cho ngân hàng, trường học, nhà mạng, sàn BĐS, cộng đồng học tập…
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <a
              href="tel:0903477118"
              className="inline-flex items-center justify-center rounded-xl border bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
            >
              Gọi: 0903 477 118
            </a>
            <a
              href="https://zalo.me/0903477118"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-blue-600 px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50"
            >
              Chat Zalo
            </a>
            <a
              href="mailto:ads@emyland.vn?subject=Đăng%20quảng%20cáo&body=Chào%20EmyLand,%20tôi%20muốn%20đặt%20banner..."
              className="inline-flex items-center justify-center rounded-xl border px-5 py-3 font-semibold hover:bg-gray-50"
            >
              Email báo giá
            </a>
          </div>

          <ul className="mt-8 grid gap-3 text-gray-700">
            <li>• Hỗ trợ thiết kế banner miễn phí (nếu cần).</li>
            <li>• Link click về website/landing page/Zalo của bạn.</li>
            <li>• Báo cáo lượt hiển thị & lượt nhấp hàng tuần.</li>
          </ul>

          <div className="mt-10 flex justify-center">
            <Link
              to="/"
              className="rounded-xl border px-5 py-3 font-semibold hover:bg-gray-50"
            >
              ← Về trang chủ
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
