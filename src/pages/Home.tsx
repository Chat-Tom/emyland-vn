import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Search, MapPin, Calculator, Star, TrendingUp, Award } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  const { data: featuredProperties, isLoading } = useQuery({
    queryKey: ["properties", { limit: 6 }],
    queryFn: async () => {
      return {
        properties: [
          {
            id: "1",
            title: "Căn hộ cao cấp Vinhomes Central Park",
            price: 8500000000,
            location: "Quận Bình Thạnh, TP.HCM",
            area: 85,
            bedrooms: 2,
            bathrooms: 2,
            images: ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"],
            type: "apartment",
            verificationStatus: "verified"
          },
          {
            id: "2", 
            title: "Nhà phố hiện đại Thủ Đức",
            price: 12000000000,
            location: "TP. Thủ Đức, TP.HCM",
            area: 120,
            bedrooms: 4,
            bathrooms: 3,
            images: ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800"],
            type: "house",
            verificationStatus: "pending"
          }
        ]
      };
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <Header user={user} onLogout={() => setUser(null)} />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-20 h-20 animate-bounce shadow-lg">
            <img 
              src="https://d64gsuwffb70l.cloudfront.net/6884f3c54508990b982512a3_1754128379233_45efa0a3.png" 
              alt="EmyLand Vietnam Sphere" 
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <div className="absolute top-32 right-20 w-16 h-16 animate-pulse shadow-lg">
            <img 
              src="https://d64gsuwffb70l.cloudfront.net/6884f3c54508990b982512a3_1754128379233_45efa0a3.png" 
              alt="EmyLand Vietnam Sphere" 
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <div className="absolute bottom-20 left-1/4 w-12 h-12 animate-ping shadow-lg">
            <img 
              src="https://d64gsuwffb70l.cloudfront.net/6884f3c54508990b982512a3_1754128379233_45efa0a3.png" 
              alt="EmyLand Vietnam Sphere" 
              className="w-full h-full object-cover rounded-full"
            />
          </div>
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 animate-fadeIn">
              <div className="inline-flex items-center gap-2 bg-yellow-400/20 backdrop-blur-sm px-4 sm:px-6 py-3 rounded-full mb-6">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 animate-spin" />
                <span className="text-sm sm:text-lg font-bold text-yellow-200">
                  Chính chủ - Không trung gian
                </span>
                <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 animate-spin" />
              </div>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6 bg-gradient-to-r from-white via-yellow-200 to-orange-200 bg-clip-text text-transparent animate-pulse leading-tight">
              EmyLand.vn
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl mb-8 font-semibold text-blue-100 px-4">
              🏠 Tìm ngôi nhà mơ ước - Pháp lý rõ ràng - Chủ nhà uy tín 🏠
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center px-4">
              <Button 
                onClick={() => navigate("/properties")}
                className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 sm:px-8 py-3 sm:py-4 text-lg sm:text-xl font-bold rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 hover:-translate-y-2 animate-bounce"
              >
                <Search className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                🔍 Tìm kiếm nhà đất ngay
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 bg-white shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
            {[
              { number: "50,000+", label: "Tin đăng chính chủ", icon: "🏘️" },
              { number: "25,000+", label: "Khách hàng tin tưởng", icon: "👥" },
              { number: "99%", label: "Độ hài lòng", icon: "⭐" },
              { number: "24/7", label: "Hỗ trợ khách hàng", icon: "📞" }
            ].map((stat, index) => (
              <div key={index} className="transform hover:scale-110 transition-all duration-300 p-2">
                <div className="text-3xl sm:text-4xl mb-2">{stat.icon}</div>
                <div className="text-2xl sm:text-3xl font-black text-blue-600 mb-1">{stat.number}</div>
                <div className="text-sm sm:text-base text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-orange-400/20 backdrop-blur-sm border border-white/30 text-gray-800 px-8 sm:px-12 py-4 sm:py-6 rounded-3xl mb-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <Award className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500" />
              <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Nhà đất bán và cho thuê nổi bật</h2>
              <Award className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500" />
            </div>
            <p className="text-lg sm:text-xl font-semibold px-4 animate-bounce">
              <span className="text-yellow-400 drop-shadow-lg">⭐ Những bất động sản chất lượng liên hệ trực tiếp chính chủ ⭐</span>
            </p>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse shadow-lg">
                  <div className="h-48 sm:h-64 bg-gradient-to-r from-gray-200 to-gray-300 rounded-t-lg"></div>
                  <CardContent className="p-4 sm:p-6">
                    <div className="h-6 bg-gray-200 rounded mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded mb-4"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {featuredProperties?.properties?.map((property: any) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onViewDetails={(id) => navigate(`/properties/${id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-blue-100/50 via-purple-100/50 to-orange-100/50 text-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 bg-clip-text text-transparent">🌟 Tại sao chọn EmyLand? 🌟</h2>
            <p className="text-lg sm:text-xl text-gray-600 px-4 font-medium">
              Nền tảng BĐS chính chủ hàng đầu Việt Nam với hàng nghìn tỷ đồng giao dịch thành công
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              {
                icon: <Shield className="w-10 h-10 sm:w-12 sm:h-12" />,
                title: "100% Chính Chủ",
                desc: "Không trung gian, tiết kiệm chi phí",
                color: "from-green-400 to-blue-500"
              },
              {
                icon: <Search className="w-10 h-10 sm:w-12 sm:h-12" />,
                title: "Tìm Kiếm Thông Minh",
                desc: "AI hỗ trợ tìm BĐS phù hợp",
                color: "from-purple-400 to-pink-500"
              },
              {
                icon: <MapPin className="w-10 h-10 sm:w-12 sm:h-12" />,
                title: "Tra Cứu Quy Hoạch",
                desc: "Thông tin quy hoạch chi tiết",
                color: "from-yellow-400 to-orange-500"
              },
              {
                icon: <Calculator className="w-10 h-10 sm:w-12 sm:h-12" />,
                title: "Thẩm Định Giá",
                desc: "Dịch vụ định giá chuyên nghiệp",
                color: "from-red-400 to-pink-500"
              }
            ].map((feature, index) => (
              <Card key={index} className="bg-white/80 backdrop-blur-sm border-gray-200 text-gray-800 hover:bg-white/90 hover:shadow-lg transition-all duration-300 transform hover:scale-105 hover:-translate-y-2">
                <CardContent className="p-6 sm:p-8 text-center">
                  <div className={`bg-gradient-to-r ${feature.color} w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-xl`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">{feature.title}</h3>
                  <p className="text-sm sm:text-base opacity-90">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>



      <Footer />
    </div>
  );
}