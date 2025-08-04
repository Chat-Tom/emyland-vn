import { Building, Phone, Mail, MapPin, Facebook, Youtube, Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-500 to-orange-500 p-2 rounded-xl">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">EmyLand.vn</h3>
                <p className="text-sm text-blue-200">Chính chủ 100%</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Nền tảng bất động sản chính chủ hàng đầu Việt Nam. 
              Kết nối trực tiếp chủ nhà và khách hàng.
            </p>
            <div className="flex gap-3">
              <div className="bg-blue-600 p-2 rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                <Facebook className="w-5 h-5" />
              </div>
              <div className="bg-red-600 p-2 rounded-lg hover:bg-red-700 cursor-pointer transition-colors">
                <Youtube className="w-5 h-5" />
              </div>
              <div className="bg-yellow-600 p-2 rounded-lg hover:bg-yellow-700 cursor-pointer transition-colors">
                <Zap className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-orange-300">Liên kết nhanh</h4>
            <ul className="space-y-2 text-sm">
              {[
                "Trang chủ",
                "Bất động sản",
                "Tin tức",
                "Hướng dẫn",
                "Liên hệ"
              ].map((item, index) => (
                <li key={index}>
                  <a href="#" className="text-gray-300 hover:text-orange-300 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-orange-300">Dịch vụ</h4>
            <ul className="space-y-2 text-sm">
              {[
                "Mua bán BĐS",
                "Cho thuê",
                "Thẩm định giá",
                "Tư vấn đầu tư",
                "Tra cứu quy hoạch"
              ].map((item, index) => (
                <li key={index}>
                  <a href="#" className="text-gray-300 hover:text-orange-300 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-orange-300">Liên hệ</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-green-400" />
                <span className="text-gray-300">0903.496.118</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-blue-400" />
                <span className="text-gray-300">info@emyland.vn</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-red-400 mt-0.5" />
                <span className="text-gray-300">
                  TP. Hồ Chí Minh, Việt Nam
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Section */}
        <div className="border-t border-gray-700 mt-8 pt-6">
          <div className="text-center">
            <a 
              href="/system-dashboard" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <span>🔧 Quản lý hệ thống</span>
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              © 2024 EmyLand.vn. Tất cả quyền được bảo lưu.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-orange-300 transition-colors">
                Điều khoản sử dụng
              </a>
              <a href="#" className="text-gray-400 hover:text-orange-300 transition-colors">
                Chính sách bảo mật
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}