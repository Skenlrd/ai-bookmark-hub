-- Add Notion settings and preferences to profiles table
ALTER TABLE public.profiles
ADD COLUMN notion_token TEXT,
ADD COLUMN notion_database_id TEXT,
ADD COLUMN dark_mode BOOLEAN DEFAULT false,
ADD COLUMN api_key TEXT UNIQUE;

-- Create index for faster API key lookups
CREATE INDEX idx_profiles_api_key ON public.profiles(api_key);

-- Function to generate API key for users
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'sk_' || encode(gen_random_bytes(32), 'hex');
END;
$$;