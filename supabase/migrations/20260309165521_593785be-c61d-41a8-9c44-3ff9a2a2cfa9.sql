
ALTER TABLE public.debate_sessions
  ADD COLUMN parent_session_id uuid REFERENCES public.debate_sessions(id) ON DELETE SET NULL DEFAULT NULL,
  ADD COLUMN version integer NOT NULL DEFAULT 1;
