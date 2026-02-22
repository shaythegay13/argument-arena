
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own contact messages"
ON public.contact_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own contact messages"
ON public.contact_messages
FOR SELECT
USING (auth.uid() = user_id);
