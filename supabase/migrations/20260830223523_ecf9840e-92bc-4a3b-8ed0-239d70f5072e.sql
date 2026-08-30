ALTER TABLE public.contact_messages ALTER COLUMN user_id DROP NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;

DROP POLICY IF EXISTS "Users can view their own contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Users can insert their own contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Users can update their own contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Users can delete their own contact messages" ON public.contact_messages;

CREATE POLICY "Users can view their own contact messages"
  ON public.contact_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contact messages"
  ON public.contact_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contact messages"
  ON public.contact_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);