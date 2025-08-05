import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Eye, EyeOff, Building2 } from 'lucide-react';
import { StorageManager, UserAccount } from '../../utils/storage';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    } else if (StorageManager.getUserByEmail(formData.email)) {
      newErrors.email = 'Email đã được sử dụng';
    }

    if (!formData.password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Xác nhận mật khẩu là bắt buộc';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
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
      // Tạo tài khoản mới với StorageManager
      const newUser: UserAccount = {
        id: StorageManager.generateId(),
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phone: formData.phone,
        registeredAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        isLoggedIn: true,
        rememberMe: true // Tự động ghi nhớ cho người dùng mới
      };

      // Lưu người dùng và đặt làm người dùng hiện tại
      StorageManager.saveUser(newUser);
      StorageManager.setCurrentUser(newUser);

      console.log('✅ User registered successfully:', newUser.email);
      
      // Add log entry
      const logs = JSON.parse(localStorage.getItem('emyland_logs') || '[]');
      logs.unshift({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: 'register',
        message: `New user registered: ${newUser.email}`,
        data: { email: newUser.email, fullName: newUser.fullName, phone: newUser.phone }
      });
      localStorage.setItem('emyland_logs', JSON.stringify(logs.slice(0, 100)));

      // Chuyển hướng đến trang đăng tin
      navigate('/post-property');
    } catch (error) {
      console.error('Registration error:', error);
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
    
    // Xóa lỗi khi người dùng bắt đầu nhập
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
            Đăng ký tài khoản
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Tạo tài khoản để đăng tin bất động sản miễn phí
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

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Xác nhận mật khẩu *
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Nhập lại mật khẩu"
                  className={`pr-10 ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
              )}
            </div>


            <div className="flex items-start space-x-2 pt-2">
              <input
                type="checkbox"
                id="terms"
                required
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="terms" className="text-sm text-gray-600">
                Tôi đồng ý với{' '}
                <a href="/terms" className="text-blue-600 hover:underline">
                  điều khoản sử dụng
                </a>{' '}
                và{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">
                  chính sách bảo mật
                </a>
              </label>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              {isLoading ? 'Đang đăng ký...' : 'Đăng ký tài khoản'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Đã có tài khoản?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-blue-600 hover:underline font-medium"
              >
                Đăng nhập ngay
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
