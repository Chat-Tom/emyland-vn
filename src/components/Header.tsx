import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Menu, X, User, LogOut, LayoutDashboard, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { useAuth } from '../contexts/AuthContext';
const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handlePostProperty = () => {
    if (user && user.isLoggedIn) {
      navigate('/post-property');
    } else {
      navigate('/register');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { label: 'Tra cứu quy hoạch', path: '/planning-lookup' },
    { label: 'Thẩm định giá - Chứng thư', path: '/valuation-certificate' },

  ];

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo với "100% chính chủ" và Nút Đăng tin miễn phí */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <img 
                  src="https://d64gsuwffb70l.cloudfront.net/6884f3c54508990b982512a3_1754128379233_45efa0a3.png"
                  alt="EmyLand Logo" 
                  className="h-8 w-8 object-cover rounded-full"
                />
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
                  EmyLand
                </span>
              </div>
              <span className="text-xs text-orange-500 font-semibold -mt-1">100% chính chủ</span>
            </Link>
            
            {/* Nút Đăng tin miễn phí với animation bounce */}
            <Button
              onClick={handlePostProperty}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 animate-bounce flex items-center gap-2"
            >
              <span className="hidden sm:inline">Đăng tin miễn phí</span>
              <span className="sm:hidden">Đăng tin</span>
            </Button>
          </div>

          {/* Navigation Menu - Desktop */}
          <nav className="hidden md:flex items-center space-x-6">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200"
              >
                {item.label}
              </Link>
            ))}
            
            {/* User Menu */}
            {/* User Menu - Dropdown */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 hover:bg-gray-50"
                  >
                    <img 
                      src="https://d64gsuwffb70l.cloudfront.net/6884f3c54508990b982512a3_1754146152775_21c04ef8.png" 
                      alt="Avatar" 
                      className="h-6 w-6 object-cover rounded-full"
                    />
                    <span className="text-sm font-medium">Tài khoản</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem 
                    onClick={() => window.location.href = '/dashboard'}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center gap-2 text-gray-600">
                    <User className="h-4 w-4" />
                    <span className="text-sm">{user.email}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="flex items-center gap-2 cursor-pointer text-red-600 hover:text-red-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => navigate('/register')}
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
              >
                Đăng nhập
              </Button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <nav className="flex flex-col space-y-4">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 px-2 py-1"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              
              {/* Mobile User Menu */}
              {/* Mobile User Menu - Dropdown */}
              {user ? (
                <div className="border-t border-gray-200 pt-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full flex items-center gap-2 justify-center"
                      >
                        <img 
                          src="https://d64gsuwffb70l.cloudfront.net/6884f3c54508990b982512a3_1754146152775_21c04ef8.png" 
                          alt="Avatar" 
                          className="h-6 w-6 object-cover rounded-full"
                        />
                        <span className="text-sm font-medium">Tài khoản</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-56">
                      <DropdownMenuItem 
                        onClick={() => {
                          window.location.href = '/dashboard';
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="flex items-center gap-2 text-gray-600">
                        <User className="h-4 w-4" />
                        <span className="text-sm">{user.email}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => {
                          handleLogout();
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-2 cursor-pointer text-red-600 hover:text-red-700"
                      >
                        <LogOut className="h-4 w-4" />
                        Đăng xuất
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="border-t border-gray-200 pt-4">
                  <Button
                    onClick={() => {
                      navigate('/register');
                      setIsMenuOpen(false);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Đăng nhập
                  </Button>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;