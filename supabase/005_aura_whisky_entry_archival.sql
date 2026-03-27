ALTER TABLE public.aura_whisky_entries
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;
