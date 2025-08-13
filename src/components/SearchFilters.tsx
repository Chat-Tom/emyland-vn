// src/components/SearchFilters.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// ⛳️ Dùng đúng dataset của Tom
import { provinces, wardsByProvince } from "@/data/vietnam-locations";

// (tuỳ chỗ dùng) type đơn giản cho callback
export type SearchFiltersValue = {
  provinceId: string; // "02" | "" ...
  ward: string;       // tên phường/xã
  keyword?: string;   // ví dụ từ khoá
};

type Props = {
  defaultValue?: Partial<SearchFiltersValue>;
  onSearch?: (v: SearchFiltersValue) => void;
  className?: string;
};

const SearchFilters: React.FC<Props> = ({ defaultValue, onSearch, className }) => {
  // Lưu ID tỉnh, tên phường
  const [provinceId, setProvinceId] = React.useState<string>(defaultValue?.provinceId ?? "");
  const [ward, setWard] = React.useState<string>(defaultValue?.ward ?? "");
  const [keyword, setKeyword] = React.useState<string>(defaultValue?.keyword ?? "");

  // Bỏ option placeholder trong provinces (provinceId === "01")
  const provinceOptions = React.useMemo(
    () =>
      provinces
        .filter((p) => p.provinceId !== "01")
        .sort((a, b) => a.provinceName.localeCompare(b.provinceName, "vi")),
    []
  );

  // Lấy danh sách phường theo ID tỉnh
  const wardOptions = React.useMemo<string[]>(
    () => (provinceId ? wardsByProvince[provinceId] ?? [] : []),
    [provinceId]
  );

  // Đổi tỉnh -> reset phường
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setProvinceId(id);
    setWard("");
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setWard(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value: SearchFiltersValue = { provinceId, ward, keyword: keyword.trim() };
    onSearch ? onSearch(value) : console.log("SearchFilters submit:", value);
  };

  return (
    <form onSubmit={handleSubmit} className={className ?? ""}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        {/* Tỉnh/Thành */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Khu vực</label>
          <select
            value={provinceId}
            onChange={handleProvinceChange}
            className="h-11 w-full rounded-md border bg-white px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Trên toàn quốc</option>
            {provinceOptions.map((p) => (
              <option key={p.provinceId} value={p.provinceId} title={p.provinceName}>
                {p.provinceName}
              </option>
            ))}
          </select>
        </div>

        {/* Phường/Xã */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Phường/Xã</label>
          <select
            value={ward}
            onChange={handleWardChange}
            disabled={!provinceId}
            className="h-11 w-full rounded-md border bg-white px-3 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{provinceId ? "Chọn Phường/Xã" : "Chọn tỉnh trước"}</option>
            {wardOptions.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        {/* Từ khoá (tuỳ chọn) */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Từ khoá</label>
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="VD: nhà phố, căn góc…"
            className="h-11"
          />
        </div>

        {/* Nút tìm */}
        <div className="space-y-1">
          <Button
            type="submit"
            className="h-11 w-full bg-gradient-to-r from-blue-600 to-orange-500 text-white font-semibold"
          >
            Tìm kiếm
          </Button>
        </div>
      </div>
    </form>
  );
};

export default SearchFilters;
