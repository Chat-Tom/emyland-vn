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
    verificationStatus?: 'verified' | 'pending' | 'unverified';
  };
  onViewDetails: (id: string) => void;
}


export default function PropertyCard({ property, onViewDetails }: PropertyCardProps) {
  const formatPrice = (price: number) => {
    if (price >= 1000000000) {
      return `${(price / 1000000000).toFixed(1)} tỷ`;
    }
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(0)} triệu`;
    }
    return price.toLocaleString();
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      apartment: "Căn hộ",
      house: "Nhà phố",
      villa: "Biệt thự",
      land: "Đất nền"
    };
    return types[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      apartment: "bg-blue-500",
      house: "bg-green-500", 
      villa: "bg-purple-500",
      land: "bg-orange-500"
    };
    return colors[type] || "bg-gray-500";
  };

  const getVerificationBadge = () => {
    const status = property.verificationStatus || 'pending';
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-green-500 text-white font-semibold px-3 py-1">
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
    <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 border-0 shadow-lg bg-white">
      {/* Image Container */}
      <div className="relative overflow-hidden">
        <img
          src={property.images[0] || "/placeholder-property.jpg"}
          alt={property.title}
          className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
        />
        
        {/* Overlay Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge className={`${getTypeColor(property.type)} text-white font-semibold px-3 py-1`}>
            {getTypeLabel(property.type)}
          </Badge>
          <Badge className="bg-red-500 text-white font-semibold px-3 py-1 animate-pulse">
            🔥 HOT
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button size="sm" variant="secondary" className="p-2 rounded-full bg-white/90 hover:bg-white">
            <Heart className="w-4 h-4 text-red-500" />
          </Button>
        </div>

        {/* Price Overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black">
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

      <CardContent className="p-6">
        {/* Title */}
        <h3 className="font-bold text-lg mb-3 line-clamp-2 text-gray-800 group-hover:text-blue-600 transition-colors">
          {property.title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-2 text-gray-600 mb-4">
          <MapPin className="w-4 h-4 text-red-500" />
          <span className="text-sm font-medium">{property.location}</span>
        </div>

        {/* Property Details */}
        <div className="flex items-center gap-4 mb-6 text-sm text-gray-600">
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

        {/* Verification Status */}
        <div className="mb-4">
          {getVerificationBadge()}
        </div>

        {/* Action Button */}
        <Button
          onClick={() => onViewDetails(property.id)}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          <Eye className="w-4 h-4 mr-2" />
          Xem chi tiết
        </Button>
      </CardContent>
    </Card>
  );
}