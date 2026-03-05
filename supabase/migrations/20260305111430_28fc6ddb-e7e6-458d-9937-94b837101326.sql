
-- Add is_public column to debate_sessions
ALTER TABLE public.debate_sessions ADD COLUMN is_public boolean NOT NULL DEFAULT false;

-- Allow anyone to SELECT public sessions (no auth required)
CREATE POLICY "Anyone can view public sessions"
ON public.debate_sessions
FOR SELECT
TO anon, authenticated
USING (is_public = true);
