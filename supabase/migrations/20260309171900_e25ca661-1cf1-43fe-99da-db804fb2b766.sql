
-- Allow anon to update view_count on public sessions
CREATE POLICY "Anyone can increment view count on public sessions"
ON public.debate_sessions
FOR UPDATE TO anon
USING (is_public = true)
WITH CHECK (is_public = true);
