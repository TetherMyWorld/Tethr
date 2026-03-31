begin;

create table if not exists public.dream_entries (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  dream_summary text not null,
  restfulness_rating integer check (
    restfulness_rating is null
    or (restfulness_rating between 1 and 5)
  ),
  wake_feeling text not null default '',
  sleep_context_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dream_entries_workspace_user_created
  on public.dream_entries (workspace_id, user_id, created_at desc);

commit;
