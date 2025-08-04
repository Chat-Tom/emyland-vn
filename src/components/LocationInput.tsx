import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, ExternalLink } from "lucide-react";

interface LocationInputProps {
  address: string;
  onAddressChange: (address: string) => void;
}

export default function LocationInput({ address, onAddressChange }: LocationInputProps) {
  const [mapUrl, setMapUrl] = useState("");

  const generateMapUrl = () => {
    if (address.trim()) {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      setMapUrl(url);
    }
  };

  const openMap = () => {
    if (mapUrl) {
      window.open(mapUrl, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Địa chỉ chi tiết *
        </Label>
        <Input
          id="address"
          type="text"
          placeholder="Nhập địa chỉ chi tiết (số nhà, tên đường...)"
          value={address}
          onChange={(e) => {
            onAddressChange(e.target.value);
            setMapUrl("");
          }}
          className="h-12 border-2 focus:border-blue-500"
          required
        />
      </div>
      
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={generateMapUrl}
          disabled={!address.trim()}
          className="flex-1"
        >
          <MapPin className="w-4 h-4 mr-2" />
          Tạo link định vị
        </Button>
        
        {mapUrl && (
          <Button
            type="button"
            variant="default"
            onClick={openMap}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Mở Google Maps
          </Button>
        )}
      </div>
      
      {mapUrl && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            Link định vị đã được tạo! Nhấp "Mở Google Maps" để xem vị trí.
          </p>
        </div>
      )}
    </div>
  );
}