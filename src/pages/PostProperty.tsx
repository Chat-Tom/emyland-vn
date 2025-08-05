// src/pages/PostProperty.tsx

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
import { StorageManager, PropertyListing } from "../../utils/storage";
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
    contactEmail: "",
    images: [] as string[]
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (field === 'province') newData.ward = '';
      return newData;
    });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.province || !formData.propertyType || !formData.address || !formData.price || !formData.contactPhone || !formData.area) {
      toast({ title: "Lỗi", description: "Vui lòng điền đầy đủ thông tin bắt buộc", variant: "destructive" });
      return;
    }
    if (formData.area && parseFloat(formData.area) < 10) {
      toast({ title: "Lỗi", description: "Diện tích phải lớn hơn 10 m²", variant: "destructive" });
      return;
    }

    const currentUser = StorageManager.getCurrentUser();
    if (!currentUser) {
      toast({ title: "Lỗi", description: "Vui lòng đăng nhập để đăng tin", variant: "destructive" });
      navigate('/login');
      return;
    }

    setIsSubmitting(true);

    try {
      toast({ title: "Đang xử lý...", description: "Tin đăng của bạn đang được xử lý" });

      const propertyData = {
        title: `${formData.propertyType} ${formData.area}m² tại ${formData.address}`,
        description: formData.description || `${formData.propertyType} ${formData.area}m² tại ${formData.address}`,
        location: `${formData.address}, ${formData.ward}, ${formData.province}`,
        price: parseFloat(formData.price.replace(/[^\d.]/g, '')) || 0,
        area: parseFloat(formData.area),
        phone: formData.contactPhone,
        images: formData.images
      };

      await PropertyService.createProperty(propertyData);

      // SỬA CHUẨN ĐOẠN contactInfo ĐÚNG TYPE:
      const propertyListing: PropertyListing = {
        id: StorageManager.generateId(),
        userEmail: currentUser.email,
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
          name: formData.contactName || currentUser.fullName || "",
          phone: formData.contactPhone,
          email: formData.contactEmail || currentUser.email || "",
          ownerVerified: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      StorageManager.saveProperty(propertyListing);

      toast({
        title: "🎉 Listing submitted successfully!",
        description: "Tin đăng của bạn đã được lưu và sẽ hiển thị công khai trên trang bất động sản",
      });

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
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 hover:bg-blue-50">
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
                {/* Các trường nhập khác... */}
                {/* ... */}
                {/* Thông tin liên hệ (bổ sung email) */}
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail" className="text-sm font-medium flex items-center gap-2">
                      Email liên hệ
                    </Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="Email của bạn"
                      value={formData.contactEmail}
                      onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                      className="h-12 border-2 focus:border-blue-500"
                    />
                  </div>
                </div>
                {/* ...Các phần còn lại giữ nguyên... */}
                <div className="flex gap-4 pt-6">
                  <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1 h-12">
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
