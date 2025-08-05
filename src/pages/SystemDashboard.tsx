import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StorageManager, UserAccount, PropertyListing } from '../../utils/storage';
import { Users, Home, Settings, BarChart3, Trash2, Eye } from 'lucide-react';
import LogsContent from '@/components/LogsContent';

const SystemDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Kiểm tra quyền admin
    const currentUser = StorageManager.getCurrentUser();
    if (!currentUser || !currentUser.isLoggedIn) {
      navigate('/login');
      return;
    }

    // Kiểm tra quyền admin (chỉ admin mới có thể truy cập)
    if (!currentUser.isAdmin) {
      navigate('/');
      return;
    }
      
    // Lấy tất cả dữ liệu hệ thống
    const allUsers = StorageManager.getAllUsers();
    const allProperties = StorageManager.getAllProperties();
    
    setUsers(allUsers);
    setProperties(allProperties);
    setLoading(false);
  }, [navigate]);

  const handleDeleteUser = (email: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      StorageManager.deleteUser(email);
      const updatedUsers = StorageManager.getAllUsers();
      setUsers(updatedUsers);
    }
  };

  const handleDeleteProperty = (propertyId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tin đăng này?')) {
      StorageManager.deleteProperty(propertyId);
      const updatedProperties = StorageManager.getAllProperties();
      setProperties(updatedProperties);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000000) {
      return `${(price / 1000000000).toFixed(1)} tỷ`;
    } else if (price >= 1000000) {
      return `${(price / 1000000).toFixed(0)} triệu`;
    }
    return price.toLocaleString();
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quản lý hệ thống EmyLand</h1>
          <p className="text-gray-600">Quản lý người dùng và tin đăng trong hệ thống</p>
        </div>

        {/* Thống kê tổng quan */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tổng người dùng</p>
                  <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Home className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tổng tin đăng</p>
                  <p className="text-2xl font-bold text-gray-900">{properties.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tin đăng hôm nay</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {properties.filter(p => {
                      const today = new Date().toDateString();
                      const propDate = new Date(p.createdAt).toDateString();
                      return today === propDate;
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Hoạt động</p>
                  <p className="text-2xl font-bold text-gray-900">100%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Quản lý người dùng
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Quản lý tin đăng
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Danh sách người dùng ({users.length})</h2>
            </div>

            <div className="grid gap-4">
              {users.map((user) => (
                <Card key={user.email}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">{user.fullName}</h3>
                        <p className="text-gray-600">{user.email}</p>
                        <p className="text-gray-600">{user.phone}</p>
                        <p className="text-sm text-gray-500">
                          Đăng ký: {formatDate(user.registeredAt)}
                        </p>
                        <Badge variant={user.isLoggedIn ? "default" : "secondary"}>
                          {user.isLoggedIn ? "Đang online" : "Offline"}
                        </Badge>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteUser(user.email)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="properties" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Danh sách tin đăng ({properties.length})</h2>
            </div>

            <div className="grid gap-4">
              {properties.map((property) => (
                <Card key={property.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold line-clamp-1">{property.title}</h3>
                        <p className="text-gray-600 line-clamp-2">{property.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Giá: {formatPrice(property.price)} VND</span>
                          <span>•</span>
                          <span>Diện tích: {property.area}m²</span>
                          <span>•</span>
                          <span>Đăng: {formatDate(property.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{property.propertyType}</Badge>
                          <span className="text-sm text-gray-500">bởi {property.userEmail}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteProperty(property.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <LogsContent />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default SystemDashboard;