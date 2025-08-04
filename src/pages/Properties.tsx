import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import SearchFilters from "@/components/SearchFilters";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Filter, Grid, List, SlidersHorizontal } from "lucide-react";
import { PropertyService } from "@/services/propertyService";
import { useToast } from "@/hooks/use-toast";
export default function Properties() {
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<any>({});
  const { toast } = useToast();

  // Load properties from Supabase
  useEffect(() => {
    loadProperties();
  }, [filters]);

  const loadProperties = async () => {
    try {
      setIsLoading(true);
      const result = await PropertyService.getProperties(filters);
      setProperties(result.data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách bất động sản",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (searchFilters: any) => {
    setFilters(searchFilters);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header user={user} onLogout={() => setUser(null)} />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-black mb-4">
              🏠 Tìm Bất Động Sản 🏠
            </h1>
            <p className="text-xl opacity-90 mb-6">
              Hơn 50,000+ tin đăng chính chủ đang chờ bạn khám phá
            </p>
            
            {/* Quick Stats */}
            <div className="flex justify-center gap-8 text-center">
              <div>
                <div className="text-2xl font-bold text-yellow-300">50,000+</div>
                <div className="text-sm opacity-80">Tin đăng</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-300">100%</div>
                <div className="text-sm opacity-80">Chính chủ</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-300">24/7</div>
                <div className="text-sm opacity-80">Hỗ trợ</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Filters & Controls */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          {/* Filter Toggle */}
          <div className="flex items-center gap-4">
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Bộ lọc
            </Button>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex-1 flex items-center justify-between">
            <p className="text-gray-600">
              Tìm thấy <span className="font-bold text-blue-600">{properties?.length || 0}</span> kết quả
            </p>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          {showFilters && (
            <div className="w-80 flex-shrink-0">
              <SearchFilters onSearch={handleSearch} />
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1">
            {isLoading ? (
              <div className={`grid ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"} gap-6`}>
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-64 bg-gradient-to-r from-gray-200 to-gray-300 rounded-t-lg"></div>
                    <CardContent className="p-6">
                      <div className="h-6 bg-gray-200 rounded mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded mb-4"></div>
                      <div className="h-10 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : properties?.length ? (
              <div className={`grid ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"} gap-6`}>
                {properties.map((property: any) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onViewDetails={(id) => console.log("View details:", id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-bold text-gray-700 mb-2">
                  Không tìm thấy bất động sản
                </h3>
                <p className="text-gray-500 mb-6">
                  Thử điều chỉnh bộ lọc hoặc tìm kiếm với từ khóa khác
                </p>
                <Button onClick={() => window.location.reload()}>
                  Làm mới trang
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}