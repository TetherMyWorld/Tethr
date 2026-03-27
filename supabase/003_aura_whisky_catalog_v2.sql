ALTER TABLE public.aura_whiskies
  ADD COLUMN IF NOT EXISTS canonical_name text NOT NULL DEFAULT '';

ALTER TABLE public.aura_whiskies
  ADD COLUMN IF NOT EXISTS style text NOT NULL DEFAULT '';

ALTER TABLE public.aura_whiskies
  ADD COLUMN IF NOT EXISTS price_usd double precision;
