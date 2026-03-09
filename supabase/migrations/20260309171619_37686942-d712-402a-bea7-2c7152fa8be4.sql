
-- Add leaderboard columns to debate_sessions
ALTER TABLE public.debate_sessions 
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS startup_name text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

-- Create leaderboard votes table (anyone can vote)
CREATE TABLE public.leaderboard_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.debate_sessions(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('promising', 'not_a_startup')),
  voter_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, voter_fingerprint)
);

ALTER TABLE public.leaderboard_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read votes
CREATE POLICY "Anyone can read votes" ON public.leaderboard_votes
  FOR SELECT TO anon, authenticated USING (true);

-- Anyone can insert votes (one per fingerprint per session enforced by unique constraint)
CREATE POLICY "Anyone can insert votes" ON public.leaderboard_votes
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Enable realtime for votes
ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard_votes;
