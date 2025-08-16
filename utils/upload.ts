// utils/upload.ts
import { supabase } from './storage';

export async function uploadPropertyImage(file: File, propertyId: string) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${propertyId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase
    .storage
    .from('property-images')
    .upload(path, file, { upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('property-images').getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export function getPublicUrl(path: string) {
  return supabase.storage.from('property-images').getPublicUrl(path).data.publicUrl;
}
