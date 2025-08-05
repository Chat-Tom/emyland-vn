import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '../components/ui/button'; // Update đường dẫn nếu cần

const ResetPasswordPage = () => {
  const router = useRouter();
  const { token } = router.query;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!password || !confirm) {
      setError('Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự!');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu nhập lại không khớp!');
      return;
    }
    if (!token) {
      setError('Thiếu token hoặc token không hợp lệ!');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Đổi mật khẩu thành công! Đang chuyển sang trang đăng nhập...');
        setTimeout(() => router.push('/login'), 2000);
      } else {
        setError(data.error || 'Lỗi không xác định');
      }
    } catch (err) {
      setError('Không thể kết nối máy chủ!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
      <form onSubmit={handleSubmit} className="bg-white shadow-xl p-8 rounded-2xl w-full max-w-md space-y-4">
        <h2 className="text-2xl font-bold text-center mb-4">Tạo mật khẩu mới</h2>
        {error && <div className="text-red-600 bg-red-50 p-2 rounded">{error}</div>}
        {success && <div className="text-green-600 bg-green-50 p-2 rounded">{success}</div>}
        <div>
          <label className="block text-gray-700 mb-1">Mật khẩu mới</label>
          <input
            type="password"
            className="w-full border rounded p-2"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu mới"
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Nhập lại mật khẩu</label>
          <input
            type="password"
            className="w-full border rounded p-2"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Nhập lại mật khẩu"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Đang đổi mật khẩu...' : 'Xác nhận'}
        </Button>
      </form>
    </div>
  );
};

export default ResetPasswordPage;
