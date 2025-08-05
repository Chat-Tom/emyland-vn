import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StorageManager, UserAccount } from '../../utils/storage';
import { toast } from '@/hooks/use-toast';

interface UserEditModalProps {
  user: UserAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const UserEditModal: React.FC<UserEditModalProps> = ({ user, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<UserAccount>>({});

  useEffect(() => {
    if (user) {
      setFormData(user);
    }
  }, [user]);

  const handleSave = () => {
    if (!formData.email) return;

    try {
      const updatedUser: UserAccount = {
        ...formData as UserAccount,
        updatedAt: new Date().toISOString()
      };

      StorageManager.updateUser(updatedUser);
      
      // Cập nhật current user nếu đang chỉnh sửa chính mình
      const currentUser = StorageManager.getCurrentUser();
      if (currentUser && currentUser.email === updatedUser.email) {
        localStorage.setItem('emyland_user', JSON.stringify(updatedUser));
      }

      toast({
        title: "Thành công",
        description: "Cập nhật thông tin thành công!",
      });
      onSave();
      onClose();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi cập nhật thông tin!",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa thông tin cá nhân</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="fullName">Họ tên *</Label>
            <Input
              id="fullName"
              value={formData.fullName || ''}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              placeholder="Nhập họ tên"
            />
          </div>

          <div>
            <Label htmlFor="phone">Số điện thoại *</Label>
            <Input
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Nhập số điện thoại"
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={formData.email || ''}
              disabled
              className="bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">Email không thể thay đổi</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button onClick={handleSave}>
              Lưu thay đổi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserEditModal;
