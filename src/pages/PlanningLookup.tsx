import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Construction, ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PlanningLookup() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <Header user={null} onLogout={() => {}} />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto w-24 h-24 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-6">
                <Construction className="w-12 h-12 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-800 mb-4">
                Tra cứu quy hoạch
              </CardTitle>
            </CardHeader>
            
            <CardContent className="text-center pb-8">
              <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-8 mb-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  🚧 Tính năng đang phát triển 🚧
                </h3>
                <p className="text-lg text-gray-600 mb-6">
                  Chúng tôi đang hoàn thiện tính năng tra cứu quy hoạch để mang đến trải nghiệm tốt nhất cho bạn.
                </p>
                <p className="text-base text-gray-500">
                  Vui lòng quay lại sau hoặc liên hệ hotline để được hỗ trợ trực tiếp.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => navigate("/")}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-3 rounded-xl"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Về trang chủ
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => navigate("/properties")}
                  className="border-2 border-orange-400 text-orange-600 hover:bg-orange-50 px-8 py-3 rounded-xl"
                >
                  Xem bất động sản
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}