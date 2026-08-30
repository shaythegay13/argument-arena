CREATE TABLE IF NOT EXISTS public.credit_charges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  amount integer NOT NULL DEFAULT 1,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS credit_charges_session_unique ON public.credit_charges (session_id);

GRANT SELECT ON public.credit_charges TO authenticated;
GRANT ALL ON public.credit_charges TO service_role;

ALTER TABLE public.credit_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own credit charges" ON public.credit_charges;
CREATE POLICY "Users can view their own credit charges"
ON public.credit_charges FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Idempotent credit consumption: at most one charge per session id.
CREATE OR REPLACE FUNCTION public.consume_evaluation_credit(p_user_id uuid, p_session_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted boolean := false;
  v_credits integer;
BEGIN
  IF p_session_id IS NULL OR length(trim(p_session_id)) = 0 THEN
    RETURN jsonb_build_object('charged', false, 'already_charged', false, 'credits', NULL, 'error', 'missing_session');
  END IF;

  -- Existing charge (even refunded) means this session already went through billing.
  IF EXISTS (SELECT 1 FROM public.credit_charges WHERE session_id = p_session_id AND refunded_at IS NULL) THEN
    SELECT credits INTO v_credits FROM public.user_credits WHERE user_id = p_user_id;
    RETURN jsonb_build_object('charged', false, 'already_charged', true, 'credits', COALESCE(v_credits, 0));
  END IF;

  -- Lock the balance row and verify funds.
  SELECT credits INTO v_credits FROM public.user_credits WHERE user_id = p_user_id FOR UPDATE;
  IF v_credits IS NULL OR v_credits <= 0 THEN
    RETURN jsonb_build_object('charged', false, 'already_charged', false, 'credits', COALESCE(v_credits, 0), 'error', 'insufficient_credits');
  END IF;

  BEGIN
    INSERT INTO public.credit_charges (user_id, session_id, amount)
    VALUES (p_user_id, p_session_id, 1);
    v_inserted := true;
  EXCEPTION WHEN unique_violation THEN
    v_inserted := false;
  END;

  IF NOT v_inserted THEN
    RETURN jsonb_build_object('charged', false, 'already_charged', true, 'credits', v_credits);
  END IF;

  UPDATE public.user_credits
  SET credits = credits - 1, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING credits INTO v_credits;

  RETURN jsonb_build_object('charged', true, 'already_charged', false, 'credits', v_credits);
END;
$$;

-- Refund a charge when the very first generation for a session failed.
CREATE OR REPLACE FUNCTION public.refund_evaluation_credit(p_user_id uuid, p_session_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_charge_id uuid;
  v_credits integer;
BEGIN
  SELECT id INTO v_charge_id
  FROM public.credit_charges
  WHERE session_id = p_session_id AND user_id = p_user_id AND refunded_at IS NULL
  FOR UPDATE;

  IF v_charge_id IS NULL THEN
    RETURN jsonb_build_object('refunded', false);
  END IF;

  UPDATE public.credit_charges SET refunded_at = now() WHERE id = v_charge_id;

  UPDATE public.user_credits
  SET credits = credits + 1, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING credits INTO v_credits;

  RETURN jsonb_build_object('refunded', true, 'credits', COALESCE(v_credits, 0));
END;
$$;

REVOKE ALL ON FUNCTION public.consume_evaluation_credit(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_evaluation_credit(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_evaluation_credit(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_evaluation_credit(uuid, text) TO service_role;