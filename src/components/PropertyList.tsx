import { useEffect, useState } from "react";
import SearchFilters from "./SearchFilters";
import PropertyCard from "./PropertyCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Property {
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
}

export default function PropertyList() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Giả lập gọi API
  useEffect(() => {
    setTimeout(() => {
      fetch("/mock-data/properties.json")
        .then(res => res.json())
        .then(data => {
          setProperties(data);
          setFilteredProperties(data);
          setLoading(false);
        });
    }, 1200); // Loading đẹp hơn
  }, []);

  const handleSearch = (filters: any) => {
    const results = properties.filter(p => {
      const inLocation = !filters.location || p.location === filters.location;
      const inType = !filters.type || p.type === filters.type;
      const inPrice = p.price >= filters.priceMin && p.price <= filters.priceMax;
      const inArea = p.area >= filters.areaMin && p.area <= filters.areaMax;
      const inBedrooms = !filters.bedrooms || p.bedrooms === Number(filters.bedrooms);
      const inBathrooms = !filters.bathrooms || p.bathrooms === Number(filters.bathrooms);
      return inLocation && inType && inPrice && inArea && inBedrooms && inBathrooms;
    });

    setFilteredProperties(results);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-6 py-10">
      {/* Sidebar Filters */}
      <div className="md:col-span-1">
        <SearchFilters onSearch={handleSearch} />
      </div>

      {/* Property Cards */}
      <ScrollArea className="md:col-span-3 h-[calc(100vh-120px)] pr-2">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} className="h-[450px] w-full rounded-xl shadow-lg" />
            ))}
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center text-gray-500 text-lg mt-12">
            Không tìm thấy bất động sản phù hợp.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map(property => (
              <PropertyCard 
                key={property.id} 
                property={property} 
                onViewDetails={(id) => console.log("Xem chi tiết:", id)} 
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
