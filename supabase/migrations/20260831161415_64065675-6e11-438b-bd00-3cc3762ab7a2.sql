ALTER TABLE public.panelist_slots
  ADD COLUMN IF NOT EXISTS included_slots integer NOT NULL DEFAULT 3;

CREATE OR REPLACE FUNCTION public.enforce_panelist_slot_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed integer;
  v_used integer;
BEGIN
  SELECT COALESCE(included_slots, 3) + COALESCE(purchased_slots, 0)
  INTO v_allowed
  FROM public.panelist_slots
  WHERE user_id = NEW.user_id;

  IF v_allowed IS NULL THEN
    v_allowed := 3;
  END IF;

  SELECT count(*) INTO v_used
  FROM public.panelists
  WHERE user_id = NEW.user_id;

  IF v_used >= v_allowed THEN
    RAISE EXCEPTION 'Panelist slot limit reached (% of % used). Purchase more slots or upgrade your plan.', v_used, v_allowed
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_panelist_slot_limit ON public.panelists;
CREATE TRIGGER enforce_panelist_slot_limit
BEFORE INSERT ON public.panelists
FOR EACH ROW EXECUTE FUNCTION public.enforce_panelist_slot_limit();