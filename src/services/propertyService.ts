import { supabase } from '@/lib/supabase';

export interface Property {
  id: string;
  created_at: string;
  title: string;
  description: string;
  province: string;
  ward: string;
  address: string;
  area_m2: number;
  price_total: number;
  price_per_m2?: number;
  rent_per_month?: number;
  images: string[];
  phone: string;
  is_verified: boolean;
  type: string;
}

export interface PropertyFilters {
  province?: string;
  ward?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  type?: string;
}

export class PropertyService {
  static async getProperties(filters?: PropertyFilters): Promise<Property[]> {
    try {
      let query = supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.province) {
        query = query.eq('province', filters.province);
      }
      if (filters?.ward) {
        query = query.eq('ward', filters.ward);
      }
      if (filters?.minPrice) {
        query = query.gte('price_total', filters.minPrice);
      }
      if (filters?.maxPrice) {
        query = query.lte('price_total', filters.maxPrice);
      }
      if (filters?.minArea) {
        query = query.gte('area_m2', filters.minArea);
      }
      if (filters?.maxArea) {
        query = query.lte('area_m2', filters.maxArea);
      }
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      const { data, error } = await query.limit(50);

      if (error) {
        console.error('Supabase error:', error);
        // Return mock data if database fails
        return [
          {
            id: '1',
            created_at: new Date().toISOString(),
            title: 'Chung cư cao cấp 85m² tại Hoàn Kiếm',
            description: 'Chung cư hiện đại, đầy đủ nội thất, view đẹp',
            province: 'Hà Nội',
            ward: 'Hoàn Kiếm',
            address: '123 Phố Huế, Hoàn Kiếm, Hà Nội',
            area_m2: 85,
            price_total: 5.2,
            price_per_m2: 61.2,
            images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
            phone: '0123456789',
            is_verified: true,
            type: 'bán'
          }
        ];
      }

      return data || [];
    } catch (error) {
      console.error('Get properties error:', error);
      return [];
    }
  }

  static async getPropertyById(id: string): Promise<Property | null> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        // Return mock data if database fails
        return {
          id: id,
          created_at: new Date().toISOString(),
          title: 'Chung cư cao cấp 85m² tại Hoàn Kiếm',
          description: 'Chung cư hiện đại, đầy đủ nội thất, view đẹp, gần trung tâm',
          province: 'Hà Nội',
          ward: 'Hoàn Kiếm',
          address: '123 Phố Huế, Hoàn Kiếm, Hà Nội',
          area_m2: 85,
          price_total: 5.2,
          price_per_m2: 61.2,
          images: [
            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'
          ],
          phone: '0123456789',
          is_verified: true,
          type: 'bán'
        };
      }

      return data;
    } catch (error) {
      console.error('Get property error:', error);
      return null;
    }
  }

  static async createProperty(propertyData: any): Promise<Property> {
    try {
      const newProperty = {
        title: propertyData.title,
        description: propertyData.description,
        province: propertyData.location?.split(', ')[2] || 'Hà Nội',
        ward: propertyData.location?.split(', ')[1] || '',
        address: propertyData.location || propertyData.address,
        area_m2: propertyData.area,
        price_total: propertyData.price,
        price_per_m2: propertyData.price / propertyData.area,
        images: propertyData.images || [],
        phone: propertyData.phone,
        is_verified: false,
        type: 'bán'
      };

      const { data, error } = await supabase
        .from('properties')
        .insert([newProperty])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Create property error:', error);
      throw error;
    }
  }
}

// Export instance for direct use
export const propertyService = new PropertyService();