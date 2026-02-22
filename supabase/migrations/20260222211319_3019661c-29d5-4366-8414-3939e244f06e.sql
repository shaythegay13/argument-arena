
CREATE TABLE public.user_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  terms_accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agreement" ON public.user_agreements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own agreement" ON public.user_agreements FOR INSERT WITH CHECK (auth.uid() = user_id);
