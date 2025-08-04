# Hướng dẫn Setup Backend EmyLand.vn với Supabase

## 1. Thông tin kết nối Supabase

- **Project URL**: https://metbdgtkwyqggnngtscf.supabase.co
- **Anon Public Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldGJkZ3Rrd3lxZ2dubmd0c2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5OTI3MTQsImV4cCI6MjA1MzU2ODcxNH0.oEj1YwqvFHAJBWyKfvhSNjKGJKXKhzJCgHO_tLEhgqY
- **Service Role Key**: sb_secret_ltjuoCHrafwp_Er00KALqg_1YM-TLNU

## 2. Cách setup database

### Bước 1: Truy cập Supabase Dashboard
1. Đăng nhập vào https://supabase.com/dashboard
2. Chọn project EmyLand (metbdgtkwyqggnngtscf)

### Bước 2: Tạo bảng properties
1. Vào tab **SQL Editor**
2. Copy toàn bộ nội dung file `SUPABASE_DATABASE_SETUP.sql`
3. Paste vào SQL Editor và chạy

### Bước 3: Kiểm tra kết quả
1. Vào tab **Table Editor**
2. Kiểm tra bảng `properties` đã được tạo
3. Xem dữ liệu mẫu đã được insert

## 3. Schema bảng properties

| Cột | Kiểu dữ liệu | Mô tả |
|-----|-------------|-------|
| id | uuid | Mã bất động sản duy nhất (auto-generate) |
| created_at | timestamp | Thời gian đăng tin |
| title | text | Tiêu đề tin đăng |
| description | text | Mô tả chi tiết |
| province | text | Tỉnh/thành phố |
| ward | text | Phường/xã |
| address | text | Địa chỉ chi tiết |
| area_m2 | numeric | Diện tích (m²) |
| price_total | numeric | Tổng giá trị (tỷ đồng) |
| price_per_m2 | numeric | Đơn giá (triệu/m²) |
| rent_per_month | numeric | Giá thuê (triệu/tháng) - nullable |
| images | text[] | Danh sách URL hình ảnh |
| phone | text | Số điện thoại chính chủ |
| is_verified | boolean | Xác thực chính chủ |
| type | text | Loại: 'bán', 'cho thuê', 'sang nhượng' |

## 4. API Endpoints (Frontend đã tích hợp)

- `PropertyService.getProperties(filters)` - Lấy danh sách properties với filter
- `PropertyService.getPropertyById(id)` - Xem chi tiết 1 property
- `PropertyService.createProperty(data)` - Thêm mới property

## 5. Row Level Security (RLS)

- Đã bật RLS cho bảng properties
- Cho phép public read/write không cần authentication
- Có thể tùy chỉnh sau để yêu cầu đăng nhập

## 6. Tính năng đã hoàn thành

✅ Database schema hoàn chỉnh
✅ Frontend kết nối Supabase
✅ Trang danh sách properties với filter
✅ Trang chi tiết property
✅ Form đăng tin mới
✅ Image slider cho hiển thị ảnh
✅ Giao diện responsive, hiện đại

## 7. Lưu ý bảo mật

- Service Role Key chỉ dùng cho development
- Cần thu hồi và tạo key mới khi deploy production
- Cân nhắc thêm authentication cho việc đăng tin