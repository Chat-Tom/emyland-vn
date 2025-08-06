import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Bed, Bath, Square, Eye, Heart, Star } from "lucide-react";

interface PropertyCardProps {
  property: {
    id: string;
    title: string;
    price: number;
    location: string;
    area: number;
    bedrooms?: number;
    bathrooms?: number;
    images: string[];
    type: string;
    description?: string;
    verificationStatus?: 'verified' | 'pending' | 'unverified';
  };
  onViewDetails: (id: string) => void;
}

export default function PropertyCard({ property, onViewDetails }: PropertyCardProps) {
  const formatPrice = (price: number) => {
    if (price >= 1_000_000_000) {
      return `${(price / 1_000_000_000).toFixed(1)} tỷ`;
    }
    if (price >= 1_000_000) {
      return `${(price / 1_000_000).toFixed(0)} triệu`;
    }
    return price.toLocaleString();
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      apartment: "Căn hộ",
      house: "Nhà phố",
      villa: "Biệt thự",
      land: "Đất nền",
    };
    return types[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      apartment: "bg-blue-500",
      house: "bg-green-500",
      villa: "bg-purple-500",
      land: "bg-orange-500",
    };
    return colors[type] || "bg-gray-500";
  };

  const getVerificationBadge = () => {
    const status = property.verificationStatus || 'pending';
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-green-600 text-white font-semibold px-3 py-1 shadow-md">
            ✅ Đã xác nhận chính chủ
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-500 text-white font-semibold px-3 py-1 animate-pulse">
            ⏳ Đang xác nhận chính chủ
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="group overflow-hidden border-0 shadow-lg bg-white rounded-2xl hover:shadow-2xl transition-transform duration-300 transform hover:scale-[1.03] hover:-translate-y-1">
      {/* Image */}
      <div className="relative overflow-hidden">
        <img
          src={property.images[0] || "/placeholder-property.jpg"}
          alt={property.title}
          className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
        />

        {/* Badges */}
        <div className="absolute top-4 left-4 flex gap-2 z-10">
          <Badge className={`${getTypeColor(property.type)} text-white font-semibold px-3 py-1 shadow-sm`}>
            {getTypeLabel(property.type)}
          </Badge>
          <Badge className="bg-red-500 text-white font-semibold px-3 py-1 animate-bounce">
            🔥 HOT
          </Badge>
        </div>

        {/* Favorite */}
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <Button size="sm" variant="secondary" className="p-2 rounded-full bg-white/90 hover:bg-white shadow-md">
            <Heart className="w-4 h-4 text-red-500" />
          </Button>
        </div>

        {/* Price */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black drop-shadow-sm">
                {formatPrice(property.price)} VNĐ
              </span>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-300 fill-current" />
                <span className="text-sm font-semibold">4.8</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nội dung */}
      <CardContent className="p-6">
        <h3 className="font-bold text-lg mb-3 line-clamp-2 text-gray-800 group-hover:text-blue-600 transition-colors duration-300">
          {property.title}
        </h3>

        <div className="flex items-center gap-2 text-gray-600 mb-3">
          <MapPin className="w-4 h-4 text-red-500" />
          <span className="text-sm font-medium">{property.location}</span>
        </div>

        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Square className="w-4 h-4 text-blue-500" />
            <span className="font-semibold">{property.area}m²</span>
          </div>
          {property.bedrooms && (
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4 text-green-500" />
              <span className="font-semibold">{property.bedrooms} PN</span>
            </div>
          )}
          {property.bathrooms && (
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4 text-purple-500" />
              <span className="font-semibold">{property.bathrooms} WC</span>
            </div>
          )}
        </div>

        {property.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2 italic">
            {property.description}
          </p>
        )}

        {getVerificationBadge()}

        <Button
          onClick={() => onViewDetails(property.id)}
          className="mt-4 w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
        >
          <Eye className="w-4 h-4 mr-2" />
          Xem chi tiết
        </Button>
      </CardContent>
    </Card>
  );
}
