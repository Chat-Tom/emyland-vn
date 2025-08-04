# Supabase Setup Instructions

## 1. Create Supabase Project
1. Go to https://supabase.com and create a new project
2. Note down your project URL and anon key

## 2. Update Supabase Configuration
Replace the values in `src/lib/supabase.ts`:
```typescript
const supabaseUrl = 'https://your-project-ref.supabase.co'
const supabaseAnonKey = 'your-supabase-anon-key'
```

## 3. Create Properties Table
Run this SQL in your Supabase SQL Editor:

```sql
CREATE TABLE properties (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  price NUMERIC NOT NULL,
  area NUMERIC NOT NULL,
  phone TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON properties
FOR SELECT USING (true);

-- Allow public insert access
CREATE POLICY "Allow public insert access" ON properties
FOR INSERT WITH CHECK (true);
```

## 4. Test the Connection
1. Fill out the property form
2. Submit the form
3. Check your Supabase dashboard to see the data

## API Endpoint Format
Your API endpoint will be:
`POST https://your-project-ref.supabase.co/rest/v1/properties`

Headers:
- apikey: your-supabase-anon-key
- Authorization: Bearer your-supabase-anon-key
- Content-Type: application/json
- Prefer: return=representation