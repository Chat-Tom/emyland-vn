import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StorageManager, PropertyListing } from '@/utils/storage';
import { toast } from '@/hooks/use-toast';

interface PropertyEditModalProps {
  property: PropertyListing | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const PropertyEditModal: React.FC<PropertyEditModalProps> = ({ property, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<PropertyListing>>({});

  useEffect(() => {
    if (property) {
      setFormData(property);
    }
  }, [property]);

  const handleSave = () => {
    if (!formData.id) return;

    try {
      const updatedProperty: PropertyListing = {
        ...formData as PropertyListing,
        updatedAt: new Date().toISOString()
      };

      StorageManager.saveProperty(updatedProperty);
      toast({
        title: "Thành công",
        description: "Cập nhật tin đăng thành công!",
      });
      onSave();
      onClose();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi cập nhật tin đăng!",
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

  const handleLocationChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location!,
        [field]: value
      }
    }));
  };

  if (!property) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa tin đăng</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Tiêu đề *</Label>
            <Input
              id="title"
              value={formData.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Nhập tiêu đề tin đăng"
            />
          </div>

          <div>
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Mô tả chi tiết về bất động sản"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Giá (VND) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price || ''}
                onChange={(e) => handleInputChange('price', Number(e.target.value))}
                placeholder="Nhập giá"
              />
            </div>
            <div>
              <Label htmlFor="area">Diện tích (m²) *</Label>
              <Input
                id="area"
                type="number"
                value={formData.area || ''}
                onChange={(e) => handleInputChange('area', Number(e.target.value))}
                placeholder="Nhập diện tích"
                min="10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="propertyType">Loại bất động sản *</Label>
            <Select
              value={formData.propertyType || ''}
              onValueChange={(value) => handleInputChange('propertyType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại bất động sản" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apartment">Căn hộ</SelectItem>
                <SelectItem value="house">Nhà riêng</SelectItem>
                <SelectItem value="land">Đất nền</SelectItem>
                <SelectItem value="villa">Biệt thự</SelectItem>
                <SelectItem value="office">Văn phòng</SelectItem>
                <SelectItem value="commercial">Thương mại</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="address">Địa chỉ cụ thể</Label>
            <Input
              id="address"
              value={formData.location?.address || ''}
              onChange={(e) => handleLocationChange('address', e.target.value)}
              placeholder="Số nhà, tên đường..."
            />
          </div>

          <div>
            <Label htmlFor="phone">Số điện thoại liên hệ *</Label>
            <Input
              id="phone"
              value={formData.contactInfo?.phone || ''}
              onChange={(e) => handleInputChange('contactInfo', { 
                ...formData.contactInfo, 
                phone: e.target.value 
              })}
              placeholder="Nhập số điện thoại"
            />
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

export default PropertyEditModal;