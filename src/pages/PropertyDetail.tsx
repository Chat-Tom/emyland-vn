import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Bed, Bath, Square, Phone, Mail, Heart, Share2, Calendar, Eye } from "lucide-react";
import { PropertyService } from "@/services/propertyService";
export default function PropertyDetail() {
  const { id } = useParams();

  const { data: property, isLoading, error } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      if (!id) throw new Error("Property ID is required");
      
      try {
        const result = await PropertyService.getPropertyById(id);
        return result;
      } catch (error) {
        console.error("Failed to fetch property:", error);
        // Fallback to mock data for demo
        return {
          id: id,
          title: "Căn hộ cao cấp Vinhomes Central Park - View sông tuyệt đẹp",
          price: 8500000000,
          location: "Quận Bình Thạnh, TP.HCM",
          area: 85,
          description: "Căn hộ cao cấp với thiết kế hiện đại, view sông Sài Gòn tuyệt đẹp. Đầy đủ nội thất cao cấp, tiện ích đẳng cấp 5 sao.",
          phone: "0903496118",
          images: [
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
            "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
            "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800"
          ],
          created_at: "2024-01-15T00:00:00Z"
        };
      }
    },
    enabled: !!id
  });

  // Add mock data for missing fields
  const enrichedProperty = property ? {
    ...property,
    bedrooms: 2,
    bathrooms: 2,
    features: ["Hồ bơi", "Gym", "Sân tennis", "Siêu thị", "Trường học"],
    owner: {
      name: "Chính chủ",
      phone: property.phone || "0903496118",
      email: "owner@example.com"
    },
    posted: property.created_at || "2024-01-15T00:00:00Z"
  } : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!enrichedProperty) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Không tìm thấy bất động sản
          </h1>
          <Button onClick={() => window.history.back()}>
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    if (price >= 1000000000) {
      return `${(price / 1000000000).toFixed(1)} tỷ`;
    }
    return `${(price / 1000000).toFixed(0)} triệu`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Image Gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="lg:col-span-2">
            <img
              src={enrichedProperty.images[0]}
              alt={enrichedProperty.title}
              className="w-full h-96 object-cover rounded-2xl shadow-xl"
            />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            {enrichedProperty.images.slice(1, 3).map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`${enrichedProperty.title} ${index + 2}`}
                className="w-full h-44 lg:h-44 object-cover rounded-xl shadow-lg"
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Price */}
            <Card className="shadow-xl border-0 bg-gradient-to-r from-white to-blue-50">
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-black text-gray-800 mb-3">
                      {enrichedProperty.title}
                    </h1>
                    <div className="flex items-center gap-2 text-gray-600 mb-4">
                      <MapPin className="w-5 h-5 text-red-500" />
                      <span className="font-medium">{enrichedProperty.location}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Heart className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-2xl mb-6">
                  <div className="text-4xl font-black mb-2">
                    {formatPrice(enrichedProperty.price)} VNĐ
                  </div>
                  <div className="text-blue-100">
                    ~{Math.round(enrichedProperty.price / enrichedProperty.area / 1000000)} triệu/m²
                  </div>
                </div>

                {/* Property Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <Square className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <div className="font-bold text-lg">{enrichedProperty.area}m²</div>
                    <div className="text-sm text-gray-600">Diện tích</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <Bed className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <div className="font-bold text-lg">{enrichedProperty.bedrooms}</div>
                    <div className="text-sm text-gray-600">Phòng ngủ</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-xl">
                    <Bath className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                    <div className="font-bold text-lg">{enrichedProperty.bathrooms}</div>
                    <div className="text-sm text-gray-600">Phòng tắm</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-xl">
                    <Eye className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                    <div className="font-bold text-lg">1,234</div>
                    <div className="text-sm text-gray-600">Lượt xem</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4">Mô tả chi tiết</h3>
                <p className="text-gray-700 leading-relaxed">
                  {enrichedProperty.description}
                </p>
              </CardContent>
            </Card>

            {/* Features */}
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4">Tiện ích</h3>
                <div className="flex flex-wrap gap-2">
                  {enrichedProperty.features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card className="shadow-xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4 text-center">
                  📞 Liên hệ chính chủ
                </h3>
                
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold text-xl">
                      {enrichedProperty.owner.name.charAt(0)}
                    </span>
                  </div>
                  <h4 className="font-bold text-lg">{enrichedProperty.owner.name}</h4>
                  <p className="text-sm text-gray-600">Chủ nhà</p>
                </div>

                <div className="space-y-3">
                  <Button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 h-12">
                    <Phone className="w-4 h-4 mr-2" />
                    {enrichedProperty.owner.phone}
                  </Button>
                  <Button variant="outline" className="w-full h-12">
                    <Mail className="w-4 h-4 mr-2" />
                    Gửi email
                  </Button>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium text-center">
                    ⚠️ Lưu ý: Chỉ liên hệ trong giờ hành chính
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Posted Date */}
            <Card className="shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Đăng ngày: {new Date(enrichedProperty.posted).toLocaleDateString('vi-VN')}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}