CREATE TABLE IF NOT EXISTS public.aura_whisky_entries (
  id text PRIMARY KEY,
  whisky_id text NOT NULL REFERENCES public.aura_whiskies(id) ON DELETE CASCADE,
  workspace_id text NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  entry_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aura_whisky_entries_workspace_user_created
  ON public.aura_whisky_entries (workspace_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_aura_whisky_entries_whisky_created
  ON public.aura_whisky_entries (whisky_id, created_at DESC);
