
-- Remove overly broad anon update policy on debate_sessions
DROP POLICY IF EXISTS "Anyone can increment view count on public sessions" ON public.debate_sessions;

-- Secure RPC to increment view count only
CREATE OR REPLACE FUNCTION public.increment_view_count(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.debate_sessions
  SET view_count = view_count + 1
  WHERE id = p_id AND is_public = true;
$$;

REVOKE ALL ON FUNCTION public.increment_view_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid) TO anon, authenticated;

-- Prevent users from inserting their own credit rows (handled by trigger / service role)
DROP POLICY IF EXISTS "Users can insert own credits" ON public.user_credits;
