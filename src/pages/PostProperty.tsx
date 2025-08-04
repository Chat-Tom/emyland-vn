import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Home, DollarSign, FileText, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ImageUpload from "@/components/ImageUpload";
import LocationInput from "@/components/LocationInput";
import { vietnamProvinces, vietnamWards } from "@/data/vietnam-locations";
import { StorageManager, PropertyListing } from "@/utils/storage";
import { PropertyService } from "@/services/propertyService";
export default function PostProperty() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    province: "",
    ward: "",
    propertyType: "",
    address: "",
    price: "",
    area: "",
    bedrooms: "",
    bathrooms: "",
    description: "",
    contactName: "",
    contactPhone: "",
    images: [] as string[]
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      // Reset ward when province changes
      if (field === 'province') {
        newData.ward = '';
      }
      return newData;
    });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.province || !formData.propertyType || !formData.address || !formData.price || !formData.contactPhone || !formData.area) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin bắt buộc",
        variant: "destructive"
      });
      return;
    }

    // Area validation
    if (formData.area && parseFloat(formData.area) < 10) {
      toast({
        title: "Lỗi",
        description: "Diện tích phải lớn hơn 10 m²",
        variant: "destructive"
      });
      return;
    }

    // Get current user
    const currentUser = StorageManager.getCurrentUser();
    if (!currentUser) {
      toast({
        title: "Lỗi",
        description: "Vui lòng đăng nhập để đăng tin",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    setIsSubmitting(true);

    try {
      toast({
        title: "Đang xử lý...",
        description: "Tin đăng của bạn đang được xử lý",
      });

      // Prepare data for Supabase
      const propertyData = {
        title: `${formData.propertyType} ${formData.area}m² tại ${formData.address}`,
        description: formData.description || `${formData.propertyType} ${formData.area}m² tại ${formData.address}`,
        location: `${formData.address}, ${formData.ward}, ${formData.province}`,
        price: parseFloat(formData.price.replace(/[^\d.]/g, '')) || 0,
        area: parseFloat(formData.area),
        phone: formData.contactPhone,
        images: formData.images
      };

      console.log('📝 Creating property:', propertyData);

      // Submit to Supabase
      await PropertyService.createProperty(propertyData);
      
      // Also save to local storage as backup
      const propertyListing: PropertyListing = {
        id: StorageManager.generateId(),
        userId: currentUser.id,
        title: propertyData.title,
        description: propertyData.description,
        price: propertyData.price,
        area: propertyData.area,
        location: {
          province: formData.province,
          district: formData.ward,
          ward: formData.ward,
          address: formData.address
        },
        propertyType: formData.propertyType,
        images: formData.images,
        contactInfo: {
          phone: formData.contactPhone,
          ownerVerified: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active'
      };

      StorageManager.saveProperty(propertyListing);
      
      console.log('✅ Property created successfully:', propertyListing.id);
      
      // Show success toast
      toast({
        title: "🎉 Listing submitted successfully!",
        description: "Tin đăng của bạn đã được lưu và sẽ hiển thị công khai trên trang bất động sản",
      });

      // Navigate to properties page after 1.5s
      setTimeout(() => {
        navigate('/properties');
      }, 1500);

    } catch (error) {
      console.error('Error posting property:', error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi đăng tin. Vui lòng thử lại.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 hover:bg-blue-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>

          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-orange-500 rounded-full flex items-center justify-center mb-4">
                <Home className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
                Đăng tin bất động sản
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                Đăng tin miễn phí - Tiếp cận hàng triệu khách hàng
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Thông tin cơ bản
                  </h3>
                  
                  {/* Location Selection */}
                   {/* Location Selection */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                       <Label className="text-sm font-medium flex items-center gap-2">
                         <MapPin className="w-4 h-4" />
                         Tỉnh/Thành phố *
                       </Label>
                       <Select value={formData.province} onValueChange={(value) => handleInputChange('province', value)}>
                         <SelectTrigger className="h-12 border-2 focus:border-blue-500">
                           <SelectValue placeholder="Chọn tỉnh/thành phố" />
                         </SelectTrigger>
                          <SelectContent className="z-[110] bg-white/95 backdrop-blur-md shadow-xl border-2 border-blue-100 max-h-60 overflow-y-auto">
                           {vietnamProvinces.map((province) => (
                             <SelectItem key={province.value} value={province.value}>
                               {province.label}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>

                     <div className="space-y-2">
                       <Label className="text-sm font-medium">
                         Phường/Xã
                       </Label>
                       <Select value={formData.ward} onValueChange={(value) => handleInputChange('ward', value)}>
                         <SelectTrigger className="h-12 border-2 focus:border-blue-500">
                           <SelectValue placeholder="Chọn phường/xã" />
                         </SelectTrigger>
                          <SelectContent className="z-[110] bg-white/95 backdrop-blur-md shadow-xl border-2 border-blue-100 max-h-60 overflow-y-auto">
                           {vietnamWards
                             .filter(ward => !formData.province || ward.province === formData.province)
                             .map((ward) => (
                               <SelectItem key={ward.value} value={ward.value}>
                                 {ward.label}
                               </SelectItem>
                             ))}
                         </SelectContent>
                       </Select>
                     </div>
                   </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Loại bất động sản *
                      </Label>
                      <Select value={formData.propertyType} onValueChange={(value) => handleInputChange('propertyType', value)}>
                        <SelectTrigger className="h-12 border-2 focus:border-blue-500">
                          <SelectValue placeholder="Chọn loại bất động sản" />
                        </SelectTrigger>
                         <SelectContent className="z-[110] bg-white/95 backdrop-blur-md shadow-xl border-2 border-blue-100">
                          <SelectItem value="apartment">Chung cư</SelectItem>
                          <SelectItem value="house">Nhà riêng</SelectItem>
                          <SelectItem value="villa">Biệt thự</SelectItem>
                          <SelectItem value="land">Đất nền</SelectItem>
                          <SelectItem value="office">Văn phòng</SelectItem>
                          <SelectItem value="shop">Mặt bằng kinh doanh</SelectItem>
                          <SelectItem value="other">Nhà đất khác (đất nuôi trồng, nhà đất chưa có sổ đỏ,...)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-sm font-medium flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Giá *
                      </Label>
                      <Input
                        id="price"
                        type="text"
                        placeholder="Ví dụ: 5.2 tỷ"
                        value={formData.price}
                        onChange={(e) => handleInputChange('price', e.target.value)}
                        className="h-12 border-2 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <LocationInput 
                    address={formData.address}
                    onAddressChange={(address) => handleInputChange('address', address)}
                  />

                  <ImageUpload 
                    images={formData.images}
                    onImagesChange={(images) => setFormData(prev => ({ ...prev, images }))}
                  />
                </div>

                {/* Property Details */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Home className="w-5 h-5" />
                    Chi tiết bất động sản
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="space-y-2">
                       <Label htmlFor="area" className="text-sm font-medium">
                         Diện tích (m²) *
                       </Label>
                       <Input
                         id="area"
                         type="number"
                         placeholder="Tối thiểu 10 m²"
                         value={formData.area}
                         onChange={(e) => handleInputChange('area', e.target.value)}
                         className="h-12 border-2 focus:border-blue-500"
                         min="10"
                         required
                       />
                     </div>

                    <div className="space-y-2">
                      <Label htmlFor="bedrooms" className="text-sm font-medium">
                        Số phòng ngủ
                      </Label>
                      <Select value={formData.bedrooms} onValueChange={(value) => handleInputChange('bedrooms', value)}>
                        <SelectTrigger className="h-12 border-2 focus:border-blue-500">
                          <SelectValue placeholder="Chọn" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 phòng</SelectItem>
                          <SelectItem value="2">2 phòng</SelectItem>
                          <SelectItem value="3">3 phòng</SelectItem>
                          <SelectItem value="4">4 phòng</SelectItem>
                          <SelectItem value="5+">5+ phòng</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bathrooms" className="text-sm font-medium">
                        Số phòng tắm
                      </Label>
                      <Select value={formData.bathrooms} onValueChange={(value) => handleInputChange('bathrooms', value)}>
                        <SelectTrigger className="h-12 border-2 focus:border-blue-500">
                          <SelectValue placeholder="Chọn" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 phòng</SelectItem>
                          <SelectItem value="2">2 phòng</SelectItem>
                          <SelectItem value="3">3 phòng</SelectItem>
                          <SelectItem value="4+">4+ phòng</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">
                      Mô tả chi tiết
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Mô tả chi tiết về bất động sản của bạn..."
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="min-h-32 border-2 focus:border-blue-500"
                      rows={6}
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-800">
                    Thông tin liên hệ
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="contactName" className="text-sm font-medium">
                        Tên liên hệ
                      </Label>
                      <Input
                        id="contactName"
                        type="text"
                        placeholder="Tên của bạn"
                        value={formData.contactName}
                        onChange={(e) => handleInputChange('contactName', e.target.value)}
                        className="h-12 border-2 focus:border-blue-500"
                      />
                    </div>

                     <div className="space-y-2">
                       <Label htmlFor="contactPhone" className="text-sm font-medium flex items-center gap-2">
                         <Phone className="w-4 h-4" />
                         Điện thoại chính chủ *
                       </Label>
                       <Input
                         id="contactPhone"
                         type="tel"
                         placeholder="0123456789"
                         value={formData.contactPhone}
                         onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                         className="h-12 border-2 focus:border-blue-500"
                         required
                        />
                        <p className="text-xs text-gray-500 italic">
                          Tôi cam kết và đồng ý cho emyland xác minh các thông tin pháp lý để xác thực liên hệ là đúng chính chủ
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(-1)}
                      className="flex-1 h-12"
                    >
                      Hủy bỏ
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Đang xử lý...
                        </div>
                      ) : 'Đăng tin ngay'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        <Footer />
      </div>
    );
  }