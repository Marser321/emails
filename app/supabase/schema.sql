-- Create tables for Email Builder

-- 1. Brands
CREATE TABLE IF NOT EXISTS public.brands (
    id text PRIMARY KEY,
    name text NOT NULL,
    category text NOT NULL,
    colors jsonb NOT NULL,
    fonts jsonb NOT NULL,
    logo jsonb NOT NULL,
    footer jsonb NOT NULL,
    voice jsonb,
    is_favorite boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. History
CREATE TABLE IF NOT EXISTS public.history (
    id text PRIMARY KEY,
    brand_id text NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    template_type text NOT NULL,
    engine text NOT NULL,
    model text NOT NULL,
    prompt text,
    subject text NOT NULL,
    content jsonb NOT NULL,
    html_snapshot text,
    rating text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. Drafts
CREATE TABLE IF NOT EXISTS public.drafts (
    id text PRIMARY KEY,
    name text NOT NULL,
    brand_name text NOT NULL,
    template_name text NOT NULL,
    brand_id text NOT NULL,
    template text NOT NULL,
    content jsonb NOT NULL,
    date timestamp with time zone DEFAULT now()
);

-- 4. Settings (singleton)
CREATE TABLE IF NOT EXISTS public.settings (
    id text PRIMARY KEY DEFAULT 'default',
    gemini_api_key text,
    anthropic_api_key text,
    default_engine text DEFAULT 'gemini',
    assets_public_base_url text,
    migrated_from_local_storage boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT now()
);

-- Initial default settings row
INSERT INTO public.settings (id, default_engine) VALUES ('default', 'gemini') ON CONFLICT (id) DO NOTHING;

-- Storage Bucket for Assets
INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true) ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'assets');
CREATE POLICY "Allow Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'assets');
CREATE POLICY "Allow Update" ON storage.objects FOR UPDATE USING (bucket_id = 'assets');
CREATE POLICY "Allow Delete" ON storage.objects FOR DELETE USING (bucket_id = 'assets');
