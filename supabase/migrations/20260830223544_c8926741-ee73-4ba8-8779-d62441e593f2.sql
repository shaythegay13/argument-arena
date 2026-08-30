REVOKE ALL ON FUNCTION public.consume_evaluation_credit(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_evaluation_credit(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_evaluation_credit(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_evaluation_credit(uuid, text) TO service_role;