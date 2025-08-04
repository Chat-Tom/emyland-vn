import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* 404 Animation */}
        <div className="mb-8">
          <div className="text-9xl font-black text-transparent bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text animate-pulse">
            404
          </div>
          <div className="text-6xl animate-bounce mt-4">🏠</div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Oops! Trang không tồn tại
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed">
            Có vẻ như bạn đã đi lạc đường. Trang bạn tìm kiếm không tồn tại 
            hoặc đã được chuyển đi nơi khác.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={() => navigate("/")}
            className="w-full bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 text-white font-semibold py-3 h-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <Home className="w-5 h-5 mr-2" />
            Về trang chủ
          </Button>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="flex-1 h-12 border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
            
            <Button
              variant="outline"
              onClick={() => navigate("/properties")}
              className="flex-1 h-12 border-2 border-gray-300 hover:border-orange-500 hover:text-orange-600"
            >
              <Search className="w-4 h-4 mr-2" />
              Tìm BĐS
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Gợi ý:</strong> Hãy thử tìm kiếm bất động sản hoặc liên hệ với chúng tôi 
            qua hotline <span className="font-semibold">0903.496.118</span> để được hỗ trợ.
          </p>
        </div>
      </div>
    </div>
  );
}