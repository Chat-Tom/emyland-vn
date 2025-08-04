-- EmyLand.vn - Hệ thống bất động sản chính chủ
-- Database Setup Script cho Supabase

-- Tạo bảng properties với đầy đủ cột theo yêu cầu
CREATE TABLE IF NOT EXISTS properties (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  title text NOT NULL,
  description text,
  province text NOT NULL,
  ward text,
  address text NOT NULL,
  area_m2 numeric NOT NULL CHECK (area_m2 > 0),
  price_total numeric NOT NULL CHECK (price_total > 0),
  price_per_m2 numeric,
  rent_per_month numeric,
  images text[] DEFAULT '{}',
  phone text NOT NULL,
  is_verified boolean DEFAULT false,
  type text DEFAULT 'bán' CHECK (type IN ('bán', 'cho thuê', 'sang nhượng'))
);

-- Tạo index để tối ưu hóa truy vấn
CREATE INDEX IF NOT EXISTS idx_properties_province ON properties(province);
CREATE INDEX IF NOT EXISTS idx_properties_ward ON properties(ward);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price_total);
CREATE INDEX IF NOT EXISTS idx_properties_area ON properties(area_m2);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);

-- Bật Row Level Security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Tạo policy cho phép tất cả mọi người đọc dữ liệu
CREATE POLICY "Allow public read access" ON properties
  FOR SELECT USING (true);

-- Tạo policy cho phép tất cả mọi người thêm dữ liệu (không cần xác thực)
CREATE POLICY "Allow public insert access" ON properties
  FOR INSERT WITH CHECK (true);

-- Tạo policy cho phép cập nhật (có thể giới hạn sau)
CREATE POLICY "Allow public update access" ON properties
  FOR UPDATE USING (true);

-- Tạo policy cho phép xóa (có thể giới hạn sau)
CREATE POLICY "Allow public delete access" ON properties
  FOR DELETE USING (true);

-- Thêm dữ liệu mẫu
INSERT INTO properties (title, description, province, ward, address, area_m2, price_total, price_per_m2, images, phone, is_verified, type) VALUES
('Chung cư cao cấp 85m² tại Hoàn Kiếm', 'Chung cư hiện đại, đầy đủ nội thất, view đẹp', 'Hà Nội', 'Hoàn Kiếm', '123 Phố Huế, Hoàn Kiếm, Hà Nội', 85, 5.2, 61.2, '{"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"}', '0123456789', true, 'bán'),
('Nhà riêng 120m² tại Cầu Giấy', 'Nhà 4 tầng, thiết kế hiện đại, gần trường học', 'Hà Nội', 'Cầu Giấy', '456 Đường Cầu Giấy, Hà Nội', 120, 8.5, 70.8, '{"https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"}', '0987654321', false, 'bán'),
('Biệt thự 200m² tại Quận 7', 'Biệt thự sang trọng, sân vườn rộng, an ninh tốt', 'TP. Hồ Chí Minh', 'Quận 7', '789 Đường Nguyễn Thị Thập, Quận 7, TP.HCM', 200, 15.5, 77.5, '{"https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800"}', '0369852147', true, 'bán');