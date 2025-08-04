import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Eye, EyeOff, Building2 } from 'lucide-react';
import { StorageManager, UserAccount } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Check for auto-login on component mount
  useEffect(() => {
    const currentUser = StorageManager.getCurrentUser();
    if (currentUser && currentUser.isLoggedIn) {
      navigate('/post-property');
    }
  }, [navigate]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Kiểm tra thông tin đăng nhập với StorageManager
      const user = StorageManager.getUserByEmail(formData.email);

      if (user && user.password === formData.password) {
        const updatedUser: UserAccount = {
          ...user,
          isLoggedIn: true,
          rememberMe: true, // ✅ Tự động ghi nhớ luôn
          lastLoginAt: new Date().toISOString()
        };

        StorageManager.saveUser(updatedUser);
        StorageManager.setCurrentUser(updatedUser);

        login(updatedUser);

        console.log('✅ User logged in successfully:', updatedUser.email);

        if (updatedUser.isAdmin) {
          navigate('/system-dashboard', { replace: true });
        } else {
          navigate('/post-property', { replace: true });
        }
      } else {
        setErrors({ general: 'Email hoặc mật khẩu không đúng' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: 'Có lỗi xảy ra. Vui lòng thử lại.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
              EmyLand
            </span>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">
            Đăng nhập
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Đăng nhập để tiếp tục đăng tin bất động sản
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errors.general}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email *
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Nhập địa chỉ email"
                className={`${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Mật khẩu *
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Nhập mật khẩu"
                  className={`pr-10 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm">{errors.password}</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm text-blue-600 hover:underline"
                onClick={() => {
                  const email = prompt('Nhập email để khôi phục mật khẩu:');
                  if (email) {
                    alert('Liên kết khôi phục mật khẩu đã được gửi đến email của bạn!');
                  }
                }}
              >
                Quên mật khẩu?
              </button>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Chưa có tài khoản?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-blue-600 hover:underline font-medium"
              >
                Đăng ký ngay
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
