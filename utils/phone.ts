// /utils/phone.ts

/** Chuẩn hoá số điện thoại VN:
 *  - Bỏ ký tự không phải số
 *  - 84xxxxxxxxx  -> 0xxxxxxxxx
 *  - xxxxxxxxx    -> 0xxxxxxxx (nếu thiếu số 0 đầu)
 */
export function phoneVnNormalize(input: string) {
  let s = (input || "").replace(/[^\d]/g, "");
  if (s.startsWith("84")) s = "0" + s.slice(2);
  if (!s.startsWith("0") && s.length === 9) s = "0" + s; // 9 số -> thêm 0 đầu
  return s;
}

/** Kiểm tra định dạng VN cơ bản sau khi normalize (10 số, bắt đầu 0) */
export function phoneVnIsValid(raw: string) {
  const p = phoneVnNormalize(raw);
  return /^0\d{9}$/.test(p);
}

/** Alias email kỹ thuật từ phone – dùng cho Supabase Auth password flow */
export function phoneToAliasEmail(raw: string) {
  const p = phoneVnNormalize(raw);
  return `${p}@login.emyland.vn`.toLowerCase();
}

/** Hiển thị đẹp để log/UI (0903 477 118) */
export function phoneVnPretty(raw: string) {
  const p = phoneVnNormalize(raw);
  return p.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3");
}
