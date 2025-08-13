// src/components/UserEditModal.tsx
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StorageManager, type UserAccount } from '@utils/storage';

interface Props {
  user: UserAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // gọi lại để Dashboard refresh
}

const VN_PHONE_10 = /^(03|05|07|08|09)\d{8}$/i;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

// Thông báo an toàn (không phụ thuộc toast)
function notify(ok: boolean, title: string, desc?: string) {
  if (ok) {
    // eslint-disable-next-line no-alert
    alert(`${title}${desc ? `\n${desc}` : ""}`);
  } else {
    // eslint-disable-next-line no-alert
    alert(`❗ ${title}${desc ? `\n${desc}` : ""}`);
  }
}

const UserEditModal: React.FC<Props> = ({ user, isOpen, onClose, onSave }) => {
  const [form, setForm] = useState<{ fullName: string; phone: string; email: string }>({
    fullName: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      fullName: user.fullName ?? "",
      phone: user.phone ?? "",
      email: user.email ?? "",
    });
  }, [user]);

  const change = (k: "fullName" | "phone" | "email", v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const save = () => {
    if (!user) return;

    const fullName = (form.fullName || "").trim();
    const phone = (form.phone || "").trim();
    const email = (form.email || "").trim();

    if (!fullName) {
      notify(false, "Thiếu thông tin", "Vui lòng nhập Họ tên.");
      return;
    }
    if (!VN_PHONE_10.test(phone)) {
      notify(false, "Số điện thoại chưa hợp lệ", "Chỉ chấp nhận đầu 03/05/07/08/09 và đủ 10 số.");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      notify(false, "Email chưa hợp lệ", "Vui lòng kiểm tra lại email.");
      return;
    }

    // đổi email: không được trùng người khác
    const emailChanged = email !== (user.email ?? "");
    if (emailChanged && typeof StorageManager.getUserByEmail === "function") {
      const existed = StorageManager.getUserByEmail(email);
      if (existed && existed.id !== user.id) {
        notify(false, "Email đã tồn tại", "Email này đã được dùng cho tài khoản khác.");
        return;
      }
    }

    try {
      const updatedUser: UserAccount = {
        ...user,
        fullName,
        phone,
        email,
        updatedAt: new Date().toISOString(),
      };

      // LƯU an toàn: chỉ dùng các API chắc chắn có
      StorageManager.saveUser(updatedUser);
      if (typeof StorageManager.setCurrentUser === "function") {
        StorageManager.setCurrentUser(updatedUser);
      }
      // đồng bộ localStorage cho các nơi khác đang đọc trực tiếp
      try {
        localStorage.setItem("emyland_user", JSON.stringify(updatedUser));
        localStorage.setItem("user_email", updatedUser.email);
      } catch {}

      notify(true, "Cập nhật thành công!", "Thông tin tài khoản đã được lưu.");
      onSave();
      onClose();
    } catch (e) {
      notify(false, "Có lỗi xảy ra", "Không thể cập nhật thông tin, vui lòng thử lại.");
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa thông tin cá nhân</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="fullName">Họ tên *</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => change("fullName", e.target.value)}
              placeholder="Nhập họ tên"
            />
          </div>

          <div>
            <Label htmlFor="phone">Số điện thoại *</Label>
            <Input
              id="phone"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => change("phone", e.target.value)}
              placeholder="VD: 0901234567"
            />
            <p className="text-xs text-gray-500 mt-1">
              Chấp nhận số Việt Nam 10 số (đầu 03/05/07/08/09).
            </p>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => change("email", e.target.value)}
              placeholder="you@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Email dùng để khôi phục tài khoản khi quên mật khẩu.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button onClick={save}>Lưu thay đổi</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserEditModal;
