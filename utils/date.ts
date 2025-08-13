export const nowIso = () => new Date().toISOString();
export const formatDateTime = (d: string | number | Date) =>
  new Date(d).toLocaleString("vi-VN");
