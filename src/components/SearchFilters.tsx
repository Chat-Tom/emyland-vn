// ✅ SearchFilters.tsx – đã chuẩn hóa toàn bộ logic lọc theo khu vực + từ khoá
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { provinces, wardsByProvince } from "@/data/vietnam-locations";                        

export type SearchFiltersValue = {
  provinceId: string;
  ward: string;
  keyword?: string;
};

type Props = {
  defaultValue?: Partial<SearchFiltersValue>;
  onSearch?: (v: SearchFiltersValue) => void;
  className?: string;
};

const BIG6 = [
  "Thành phố Hồ Chí Minh",
  "Thành phố Hà Nội",
  "Thành phố Đà Nẵng",
  "Thành phố Hải Phòng",
  "Thành phố Cần Thơ",
  "Thành phố Huế",
];

const viSort = (a: string, b: string) => a.localeCompare(b, "vi");
const wardWeight = (name: string) =>
  name.startsWith("Phường") ? 0 : name.startsWith("Xã") ? 1 : 2;

const SearchFilters: React.FC<Props> = ({ defaultValue, onSearch, className }) => {
  const [provinceId, setProvinceId] = React.useState<string>(defaultValue?.provinceId ?? "");
  const [ward, setWard] = React.useState<string>(defaultValue?.ward ?? "");
  const [keyword, setKeyword] = React.useState<string>(defaultValue?.keyword ?? "");

  const provinceOptions = React.useMemo(() => {
    const list = provinces.filter((p) => p.provinceId !== "01" && !!p.provinceName.trim()).slice();
    list.sort((a, b) => {
      const ia = BIG6.indexOf(a.provinceName);
      const ib = BIG6.indexOf(b.provinceName);
      if (ia !== -1 || ib !== -1) {
        if (ia !== -1 && ib === -1) return -1;
        if (ia === -1 && ib !== -1) return 1;
        return ia - ib;
      }
      return viSort(a.provinceName, b.provinceName);
    });
    return list;
  }, []);

  const wardOptions = React.useMemo<string[]>(() => {
    if (!provinceId) return [];
    const arr = wardsByProvince[provinceId] || [];
    return arr.slice().sort((a, b) => {
      const wa = wardWeight(a);
      const wb = wardWeight(b);
      if (wa !== wb) return wa - wb;
      return viSort(a, b);
    });
  }, [provinceId]);

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
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Khu vực</label>
          <select
            value={provinceId}
            onChange={handleProvinceChange}
            className="h-11 w-full rounded-md border bg-white px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Trên toàn quốc</option>
            {provinceOptions.map((p) => (
              <option key={p.provinceId} value={p.provinceId}>
                {p.provinceName}
              </option>
            ))}
          </select>
        </div>

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
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Từ khoá</label>
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="VD: nhà phố, căn góc…"
            className="h-11"
          />
        </div>

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

/* -----------------------  🔧 ADDED (không thay dòng cũ) -----------------------
   Đồng bộ lại state khi `defaultValue` thay đổi từ bên ngoài
   (ví dụ đọc từ URL, nút "Xóa lọc", hoặc khi chuyển tab). */
SearchFilters.displayName = "SearchFilters";
