import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { MapPin, Home, DollarSign, Square, Bed, Bath } from "lucide-react";

interface SearchFiltersProps {
  onSearch: (filters: any) => void;
}

export default function SearchFilters({ onSearch }: SearchFiltersProps) {
  const [filters, setFilters] = useState({
    location: "",
    type: "",
    priceMin: 0,
    priceMax: 50000000000,
    areaMin: 0,
    areaMax: 1000,
    bedrooms: "",
    bathrooms: ""
  });

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleReset = () => {
    const resetFilters = {
      location: "",
      type: "",
      priceMin: 0,
      priceMax: 50000000000,
      areaMin: 0,
      areaMax: 1000,
      bedrooms: "",
      bathrooms: ""
    };
    setFilters(resetFilters);
    onSearch(resetFilters);
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000000) {
      return `${(price / 1000000000).toFixed(1)} tỷ`;
    }
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(0)} triệu`;
    }
    return price.toLocaleString();
  };

  return (
    <Card className="sticky top-24 shadow-lg border-2 border-blue-100">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Bộ lọc tìm kiếm
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Location */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 font-semibold text-gray-700">
            <MapPin className="w-4 h-4 text-red-500" />
            Khu vực
          </Label>
          <Select value={filters.location} onValueChange={(value) => handleFilterChange("location", value)}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Chọn khu vực" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tất cả khu vực</SelectItem>
              <SelectItem value="quan-1">Quận 1</SelectItem>
              <SelectItem value="quan-2">Quận 2</SelectItem>
              <SelectItem value="quan-3">Quận 3</SelectItem>
              <SelectItem value="binh-thanh">Quận Bình Thạnh</SelectItem>
              <SelectItem value="thu-duc">TP. Thủ Đức</SelectItem>
              <SelectItem value="quan-7">Quận 7</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Property Type */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 font-semibold text-gray-700">
            <Home className="w-4 h-4 text-blue-500" />
            Loại bất động sản
          </Label>
          <Select value={filters.type} onValueChange={(value) => handleFilterChange("type", value)}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Chọn loại BĐS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tất cả loại</SelectItem>
              <SelectItem value="apartment">Căn hộ</SelectItem>
              <SelectItem value="house">Nhà phố</SelectItem>
              <SelectItem value="villa">Biệt thự</SelectItem>
              <SelectItem value="land">Đất nền</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Price Range */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2 font-semibold text-gray-700">
            <DollarSign className="w-4 h-4 text-green-500" />
            Khoảng giá
          </Label>
          <div className="px-2">
            <Slider
              value={[filters.priceMin, filters.priceMax]}
              onValueChange={([min, max]) => {
                handleFilterChange("priceMin", min);
                handleFilterChange("priceMax", max);
              }}
              max={50000000000}
              step={500000000}
              className="w-full"
            />
          </div>
          <div className="flex items-center justify-between text-sm font-medium text-gray-600">
            <span>{formatPrice(filters.priceMin)}</span>
            <span>{formatPrice(filters.priceMax)}</span>
          </div>
        </div>

        {/* Area Range */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2 font-semibold text-gray-700">
            <Square className="w-4 h-4 text-purple-500" />
            Diện tích (m²)
          </Label>
          <div className="px-2">
            <Slider
              value={[filters.areaMin, filters.areaMax]}
              onValueChange={([min, max]) => {
                handleFilterChange("areaMin", min);
                handleFilterChange("areaMax", max);
              }}
              max={1000}
              step={10}
              className="w-full"
            />
          </div>
          <div className="flex items-center justify-between text-sm font-medium text-gray-600">
            <span>{filters.areaMin}m²</span>
            <span>{filters.areaMax}m²</span>
          </div>
        </div>

        {/* Bedrooms */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 font-semibold text-gray-700">
            <Bed className="w-4 h-4 text-orange-500" />
            Số phòng ngủ
          </Label>
          <Select value={filters.bedrooms} onValueChange={(value) => handleFilterChange("bedrooms", value)}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Chọn số phòng ngủ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Không yêu cầu</SelectItem>
              <SelectItem value="1">1 phòng</SelectItem>
              <SelectItem value="2">2 phòng</SelectItem>
              <SelectItem value="3">3 phòng</SelectItem>
              <SelectItem value="4">4+ phòng</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bathrooms */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 font-semibold text-gray-700">
            <Bath className="w-4 h-4 text-cyan-500" />
            Số phòng tắm
          </Label>
          <Select value={filters.bathrooms} onValueChange={(value) => handleFilterChange("bathrooms", value)}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Chọn số phòng tắm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Không yêu cầu</SelectItem>
              <SelectItem value="1">1 phòng</SelectItem>
              <SelectItem value="2">2 phòng</SelectItem>
              <SelectItem value="3">3+ phòng</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button 
            onClick={handleSearch}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 h-12 font-semibold"
          >
            Tìm kiếm
          </Button>
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="px-6 h-12"
          >
            Đặt lại
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}