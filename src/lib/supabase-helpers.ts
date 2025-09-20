// dùng chung cho mọi nơi cần ghi users_public
export async function upsertUserPublic(payload: any) {
  const { error } = await supabase.from('users_public').upsert(payload);

  if (error) {
    // Postgres unique_violation
    if ((error as any).code === '23505') {
      // Trigger/constraint đã trả message thân thiện => ưu tiên dùng
      toast.error(error.message ?? 'Đã tồn tại trên hệ thống, vui lòng chọn email/số ĐT khác.');
    } else {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
    throw error; // cho caller biết là thất bại
  }

  toast.success('Lưu thành công!');
}
