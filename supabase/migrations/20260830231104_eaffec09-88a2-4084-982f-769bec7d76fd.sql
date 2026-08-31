CREATE TABLE public.panelist_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  purchased_slots INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.panelist_slots TO authenticated;
GRANT ALL ON public.panelist_slots TO service_role;
ALTER TABLE public.panelist_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own panelist slots"
ON public.panelist_slots FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_panelist_slots_updated_at
BEFORE UPDATE ON public.panelist_slots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.panelist_slot_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL UNIQUE,
  slots INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.panelist_slot_purchases TO authenticated;
GRANT ALL ON public.panelist_slot_purchases TO service_role;
ALTER TABLE public.panelist_slot_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own panelist slot purchases"
ON public.panelist_slot_purchases FOR SELECT TO authenticated
USING (auth.uid() = user_id);