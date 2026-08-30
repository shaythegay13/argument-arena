DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_credits'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_credits;
  END IF;
END $$;

ALTER TABLE public.user_credits REPLICA IDENTITY FULL;