import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import PropertyEditModal from '@/components/PropertyEditModal';
import UserEditModal from '@/components/UserEditModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StorageManager, PropertyListing, UserAccount } from '../../utils/storage';
import { User, Home, Edit, Trash2, Eye, Plus } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserAccount | null>(null);
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProperty, setEditingProperty] = useState<PropertyListing | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);

  useEffect(() => {
    // Kiểm tra đăng nhập
    const userData = localStorage.getItem('emyland_user');
    if (!userData) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (!parsedUser.isLoggedIn) {
        navigate('/login');
        return;
      }
      
      setUser(parsedUser);
      
      // Lấy danh sách tin đăng của user
      const userProperties = StorageManager.getUserProperties(parsedUser.email);
      setProperties(userProperties);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleDeleteProperty = (propertyId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tin đăng này?')) {
      StorageManager.deleteProperty(propertyId);
      if (user) {
        const userProperties = StorageManager.getUserProperties(user.email);
        setProperties(userProperties);
      }
    }
  };

  const handleEditProperty = (property: PropertyListing) => {
    setEditingProperty(property);
    setIsEditModalOpen(true);
  };

  const handleSaveProperty = () => {
    if (user) {
      const userProperties = StorageManager.getUserProperties(user.email);
      setProperties(userProperties);
    }
  };

  const handleSaveUser = () => {
    // Reload user data
    const userData = localStorage.getItem('emyland_user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000000) {
      return `${(price / 1000000000).toFixed(1)} tỷ`;
    } else if (price >= 1000000) {
      return `${(price / 1000000).toFixed(0)} triệu`;
    }
    return price.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-lg">Đang tải...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Quản lý tài khoản và tin đăng của bạn</p>
        </div>

        <Tabs defaultValue="properties" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Tin đăng của tôi
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Thông tin cá nhân
            </TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Tin đăng của tôi ({properties.length})</h2>
              <Button onClick={() => navigate('/post-property')} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Đăng tin mới
              </Button>
            </div>

            {properties.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Home className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có tin đăng nào</h3>
                  <p className="text-gray-600 mb-6">Bắt đầu đăng tin bất động sản đầu tiên của bạn</p>
                  <Button onClick={() => navigate('/post-property')}>
                    Đăng tin ngay
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {properties.map((property) => (
                  <Card key={property.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex gap-6">
                        <div className="w-48 h-32 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                          {property.images && property.images.length > 0 ? (
                            <img 
                              src={property.images[0]} 
                              alt={property.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Home className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl font-semibold text-gray-900 line-clamp-2">
                              {property.title}
                            </h3>
                            <Badge variant="secondary">
                              {property.propertyType}
                            </Badge>
                          </div>
                          
                          <p className="text-gray-600 mb-2 line-clamp-2">{property.description}</p>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                            <span>Diện tích: {property.area}m²</span>
                            <span>•</span>
                            <span>Đăng: {formatDate(property.createdAt)}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="text-2xl font-bold text-red-600">
                              {formatPrice(property.price)} VND
                            </div>
                            
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                Xem
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center gap-1"
                                onClick={() => handleEditProperty(property)}
                              >
                                <Edit className="h-4 w-4" />
                                Sửa
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center gap-1 text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteProperty(property.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Xóa
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Thông tin tài khoản</CardTitle>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsUserEditModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Chỉnh sửa
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{user?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Họ tên</label>
                  <p className="text-gray-900">{user?.fullName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Số điện thoại</label>
                  <p className="text-gray-900">{user?.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Ngày đăng ký</label>
                  <p className="text-gray-900">{user?.createdAt ? formatDate(user.createdAt) : 'N/A'}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <PropertyEditModal
          property={editingProperty}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveProperty}
        />

        <UserEditModal
          user={user}
          isOpen={isUserEditModalOpen}
          onClose={() => setIsUserEditModalOpen(false)}
          onSave={handleSaveUser}
        />
      </div>
    </AppLayout>
  );
};

export default Dashboard;
