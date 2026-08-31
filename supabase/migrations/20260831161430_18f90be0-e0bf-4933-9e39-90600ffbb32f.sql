REVOKE ALL ON FUNCTION public.enforce_panelist_slot_limit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_panelist_slot_limit() TO service_role;