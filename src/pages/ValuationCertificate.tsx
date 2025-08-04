import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { Calculator, ArrowLeft, FileText } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ValuationCertificate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    customerName: "",
    taxId: "",
    address: "",
    representative: "",
    position: "",
    propertyAddress: "",
    googleMapsLink: "",
    purpose: "",
    day: "",
    month: "",
    year: "2025"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📋 Valuation request submitted:', formData);
    
    // Save to local storage
    const valuationRequest = {
      id: Date.now().toString(),
      ...formData,
      submittedAt: new Date().toISOString(),
      status: 'pending'
    };
    
    const existingRequests = JSON.parse(localStorage.getItem('valuationRequests') || '[]');
    existingRequests.push(valuationRequest);
    localStorage.setItem('valuationRequests', JSON.stringify(existingRequests));
    
    console.log('✅ Valuation request saved:', valuationRequest.id);
    
    alert("Yêu cầu đã được gửi cho Định giá Đất Việt để xử lý!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <Header user={null} onLogout={() => {}} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mb-4">
                <Calculator className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-800">
                PHIẾU YÊU CẦU THẨM ĐỊNH GIÁ TÀI SẢN
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="text-center mb-6">
                  <p className="text-sm">Kính gửi: Công ty Cổ phần Thẩm định giá và Tư vấn đầu tư Đất Việt</p>
                  <p className="text-sm">(Địa chỉ: 23 đường 14, phường Tân Hưng, quận 7, TP. HCM)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>1. Tên đơn vị/ khách hàng *</Label>
                    <Input 
                      value={formData.customerName}
                      onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Mã số thuế/CCCD *</Label>
                    <Input 
                      value={formData.taxId}
                      onChange={(e) => setFormData({...formData, taxId: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label>Địa chỉ *</Label>
                  <Input 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Người đại diện</Label>
                    <Input 
                      value={formData.representative}
                      onChange={(e) => setFormData({...formData, representative: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Chức vụ</Label>
                    <Input 
                      value={formData.position}
                      onChange={(e) => setFormData({...formData, position: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label>2. Nhà đất tại địa chỉ *</Label>
                  <Input 
                    value={formData.propertyAddress}
                    onChange={(e) => setFormData({...formData, propertyAddress: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Link định vị tài sản Google Maps</Label>
                  <Input 
                    value={formData.googleMapsLink}
                    onChange={(e) => setFormData({...formData, googleMapsLink: e.target.value})}
                    placeholder="https://maps.google.com/..."
                  />
                </div>

                <div>
                  <Label>3. Mục đích thẩm định giá *</Label>
                  <Textarea 
                    value={formData.purpose}
                    onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Lưu ý:</strong> Vui lòng đính kèm hình ảnh rõ nét tất cả các trang sổ đỏ, trích lục (Nếu có)
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Cam kết:</strong> Sau khi nhận Chứng thư do Quý Công ty cung cấp, chúng tôi sẽ thanh toán Phí thẩm định giá đầy đủ cho Công ty bằng tiền mặt hoặc chuyển khoản vào tài khoản của Công ty.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                  <Button 
                    type="submit"
                    className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-8 py-3 rounded-xl"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Gửi cho Định giá Đất Việt
                  </Button>
                  
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/")}
                    className="border-2 border-gray-400 text-gray-600 hover:bg-gray-50 px-8 py-3 rounded-xl"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Về trang chủ
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