-- 1) Custom panelist bios / backgrounds per user
CREATE TABLE public.panelist_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id text NOT NULL,
  display_name text,
  title text,
  bio text,
  background text,
  signature_style text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, persona_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.panelist_profiles TO authenticated;
GRANT ALL ON public.panelist_profiles TO service_role;

ALTER TABLE public.panelist_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own panelist profiles"
  ON public.panelist_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own panelist profiles"
  ON public.panelist_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own panelist profiles"
  ON public.panelist_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own panelist profiles"
  ON public.panelist_profiles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_panelist_profiles_updated_at
  BEFORE UPDATE ON public.panelist_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Auto-list every completed debate on the leaderboard unless it is private
CREATE OR REPLACE FUNCTION public.autolist_completed_session()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.judge_verdict IS NOT NULL AND COALESCE(NEW.visibility, 'private') <> 'private' THEN
    NEW.is_public := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER autolist_completed_debate_sessions
  BEFORE INSERT OR UPDATE ON public.debate_sessions
  FOR EACH ROW EXECUTE FUNCTION public.autolist_completed_session();

-- Backfill: list already-graded, non-private sessions
UPDATE public.debate_sessions
SET is_public = true
WHERE judge_verdict IS NOT NULL
  AND COALESCE(visibility, 'private') <> 'private'
  AND is_public = false;

-- Helpful indexes for leaderboard + history reads
CREATE INDEX IF NOT EXISTS debate_sessions_public_created_idx
  ON public.debate_sessions (is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS debate_sessions_user_created_idx
  ON public.debate_sessions (user_id, created_at DESC);