CREATE TABLE public.panelists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  firm text,
  credentials text,
  bio text,
  background text,
  signature_style text,
  expertise text[] NOT NULL DEFAULT '{}'::text[],
  photo_url text,
  linkedin_url text,
  base_persona_id text NOT NULL DEFAULT 'vc',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX panelists_user_id_idx ON public.panelists (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.panelists TO authenticated;
GRANT ALL ON public.panelists TO service_role;

ALTER TABLE public.panelists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own panelists"
  ON public.panelists FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own panelists"
  ON public.panelists FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own panelists"
  ON public.panelists FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own panelists"
  ON public.panelists FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_panelists_updated_at
  BEFORE UPDATE ON public.panelists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();