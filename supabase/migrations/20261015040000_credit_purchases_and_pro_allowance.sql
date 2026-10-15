-- Credit packs and the Pro monthly allowance.
-- Not applied by the change that added this file. Apply it before deploying
-- the billing code that calls these functions.
--
-- Rules match src/lib/billingRules.ts:
--   * a Checkout session id is credited once
--   * Pro gets 15 evaluations per period, unused until one month after period_end
--   * a debate session spends allowance before the purchased balance
--   * Studio is waived in the application, before consume_session_credit

CREATE TABLE public.credit_purchases (
  stripe_session_id text PRIMARY KEY,
  user_id uuid NOT NULL,
  credits integer NOT NULL CHECK (credits > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own credit purchases"
ON public.credit_purchases
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TABLE public.pro_allowances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_subscription_id text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  granted integer NOT NULL CHECK (granted > 0),
  consumed integer NOT NULL DEFAULT 0 CHECK (consumed >= 0),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, stripe_subscription_id, period_start)
);

CREATE INDEX pro_allowances_user_expires_idx
ON public.pro_allowances (user_id, expires_at);

ALTER TABLE public.pro_allowances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own pro allowances"
ON public.pro_allowances
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

ALTER TABLE public.credit_charges
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'balance',
  ADD COLUMN IF NOT EXISTS allowance_id uuid REFERENCES public.pro_allowances (id);

CREATE OR REPLACE FUNCTION public.apply_credit_purchase(
  p_user_id uuid,
  p_stripe_session_id text,
  p_credits integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted text;
  v_credits integer;
BEGIN
  IF p_stripe_session_id IS NULL OR length(trim(p_stripe_session_id)) = 0 OR p_credits IS NULL OR p_credits <= 0 THEN
    RETURN jsonb_build_object('applied', false, 'already_applied', false, 'added', 0, 'error', 'invalid_purchase');
  END IF;

  INSERT INTO public.credit_purchases (stripe_session_id, user_id, credits)
  VALUES (p_stripe_session_id, p_user_id, p_credits)
  ON CONFLICT (stripe_session_id) DO NOTHING
  RETURNING stripe_session_id INTO v_inserted;

  IF v_inserted IS NULL THEN
    SELECT credits INTO v_credits FROM public.user_credits WHERE user_id = p_user_id;
    RETURN jsonb_build_object(
      'applied', false,
      'already_applied', true,
      'added', 0,
      'credits', COALESCE(v_credits, 0)
    );
  END IF;

  INSERT INTO public.user_credits (user_id, credits)
  VALUES (p_user_id, p_credits)
  ON CONFLICT (user_id) DO UPDATE
  SET credits = public.user_credits.credits + EXCLUDED.credits,
      updated_at = now()
  RETURNING credits INTO v_credits;

  RETURN jsonb_build_object(
    'applied', true,
    'already_applied', false,
    'added', p_credits,
    'credits', v_credits
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_pro_monthly_allowance(
  p_user_id uuid,
  p_stripe_subscription_id text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_credits integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_credits IS NULL OR p_credits <= 0 OR p_period_end <= p_period_start THEN
    RETURN jsonb_build_object('granted', false, 'error', 'invalid_period');
  END IF;

  INSERT INTO public.pro_allowances (
    user_id, stripe_subscription_id, period_start, period_end, granted, consumed, expires_at
  )
  VALUES (
    p_user_id,
    p_stripe_subscription_id,
    p_period_start,
    p_period_end,
    p_credits,
    0,
    p_period_end + interval '1 month'
  )
  ON CONFLICT (user_id, stripe_subscription_id, period_start) DO NOTHING
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('granted', v_id IS NOT NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_session_credit(
  p_user_id uuid,
  p_session_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowance_id uuid;
  v_credits integer;
BEGIN
  IF p_session_id IS NULL OR length(trim(p_session_id)) = 0 THEN
    RETURN jsonb_build_object('charged', false, 'already_charged', false, 'error', 'missing_session');
  END IF;

  -- Serialize two requests for the same debate so the allowance decrement and the charge row stay together.
  PERFORM pg_advisory_xact_lock(hashtext(p_session_id), 0);

  IF EXISTS (SELECT 1 FROM public.credit_charges WHERE session_id = p_session_id) THEN
    SELECT credits INTO v_credits FROM public.user_credits WHERE user_id = p_user_id;
    RETURN jsonb_build_object('charged', false, 'already_charged', true, 'credits', COALESCE(v_credits, 0));
  END IF;

  SELECT id INTO v_allowance_id
  FROM public.pro_allowances
  WHERE user_id = p_user_id
    AND expires_at > now()
    AND consumed < granted
  ORDER BY period_start
  FOR UPDATE
  LIMIT 1;

  IF v_allowance_id IS NOT NULL THEN
    UPDATE public.pro_allowances
    SET consumed = consumed + 1
    WHERE id = v_allowance_id;

    INSERT INTO public.credit_charges (user_id, session_id, amount, source, allowance_id)
    VALUES (p_user_id, p_session_id, 1, 'allowance', v_allowance_id);

    SELECT credits INTO v_credits FROM public.user_credits WHERE user_id = p_user_id;
    RETURN jsonb_build_object(
      'charged', true,
      'already_charged', false,
      'source', 'allowance',
      'credits', COALESCE(v_credits, 0)
    );
  END IF;

  SELECT credits INTO v_credits
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_credits IS NULL OR v_credits <= 0 THEN
    RETURN jsonb_build_object('charged', false, 'already_charged', false, 'credits', COALESCE(v_credits, 0), 'error', 'insufficient_credits');
  END IF;

  BEGIN
    INSERT INTO public.credit_charges (user_id, session_id, amount, source)
    VALUES (p_user_id, p_session_id, 1, 'balance');
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('charged', false, 'already_charged', true, 'credits', v_credits);
  END;

  UPDATE public.user_credits
  SET credits = credits - 1, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING credits INTO v_credits;

  RETURN jsonb_build_object('charged', true, 'already_charged', false, 'source', 'balance', 'credits', v_credits);
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_evaluation_credit(
  p_user_id uuid,
  p_session_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_charge_id uuid;
  v_source text;
  v_allowance_id uuid;
  v_restored boolean := false;
  v_credits integer;
BEGIN
  SELECT id, source, allowance_id
  INTO v_charge_id, v_source, v_allowance_id
  FROM public.credit_charges
  WHERE session_id = p_session_id
    AND user_id = p_user_id
    AND refunded_at IS NULL
  FOR UPDATE;

  IF v_charge_id IS NULL THEN
    RETURN jsonb_build_object('refunded', false);
  END IF;

  IF v_source = 'allowance' AND v_allowance_id IS NOT NULL THEN
    UPDATE public.pro_allowances
    SET consumed = GREATEST(consumed - 1, 0)
    WHERE id = v_allowance_id
      AND expires_at > now();
    v_restored := FOUND;
  END IF;

  IF NOT v_restored THEN
    UPDATE public.user_credits
    SET credits = credits + 1, updated_at = now()
    WHERE user_id = p_user_id
    RETURNING credits INTO v_credits;
  ELSE
    SELECT credits INTO v_credits FROM public.user_credits WHERE user_id = p_user_id;
  END IF;

  UPDATE public.credit_charges
  SET refunded_at = now()
  WHERE id = v_charge_id;

  RETURN jsonb_build_object('refunded', true, 'credits', COALESCE(v_credits, 0), 'source', COALESCE(v_source, 'balance'));
END;
$$;

REVOKE ALL ON FUNCTION public.apply_credit_purchase(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_pro_monthly_allowance(uuid, text, timestamptz, timestamptz, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_session_credit(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_evaluation_credit(uuid, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.apply_credit_purchase(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_pro_monthly_allowance(uuid, text, timestamptz, timestamptz, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_session_credit(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_evaluation_credit(uuid, text) TO service_role;
