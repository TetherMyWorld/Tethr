CREATE TABLE IF NOT EXISTS public.aura_whiskies (
  id text PRIMARY KEY,
  slug text NOT NULL,
  name text NOT NULL,
  canonical_name text NOT NULL DEFAULT '',
  distillery text NOT NULL,
  expression text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  style text NOT NULL DEFAULT '',
  age_statement text NOT NULL DEFAULT '',
  abv text NOT NULL DEFAULT '',
  cask_type text NOT NULL DEFAULT '',
  price_usd double precision,
  reference_notes text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aura_whisky_user_notes (
  id text PRIMARY KEY,
  whisky_id text NOT NULL REFERENCES public.aura_whiskies(id) ON DELETE CASCADE,
  workspace_id text NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tasting_notes text NOT NULL DEFAULT '',
  personal_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_aura_whiskies_name_unique ON public.aura_whiskies (name, distillery);
CREATE INDEX IF NOT EXISTS idx_aura_whiskies_slug ON public.aura_whiskies (slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_aura_whisky_user_notes_unique
  ON public.aura_whisky_user_notes (whisky_id, workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_aura_whisky_user_notes_workspace_user
  ON public.aura_whisky_user_notes (workspace_id, user_id, updated_at DESC);
