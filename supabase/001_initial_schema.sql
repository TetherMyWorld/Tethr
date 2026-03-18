begin;

create table if not exists public.workspaces (
  id text primary key,
  name text not null,
  owner_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id text primary key,
  google_id text not null default '',
  email text not null unique,
  name text not null,
  avatar text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id text primary key,
  token text not null unique,
  user_id text not null references public.users(id) on delete cascade,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists public.locations (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.containers (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  parent_container_id text,
  location_id text references public.locations(id) on delete set null,
  name text not null,
  slug text not null,
  type text not null default '',
  description text not null default '',
  notes text not null default '',
  rfid_tag_id text not null default '',
  image_file_name text not null default '',
  image_stored_name text not null default '',
  image_mime_type text not null default '',
  image_size_bytes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.items (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  container_id text not null references public.containers(id) on delete restrict,
  name text not null,
  description text not null default '',
  notes text not null default '',
  quantity integer not null default 1 check (quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photos (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  item_id text not null references public.items(id) on delete cascade,
  file_name text not null,
  stored_name text not null,
  mime_type text not null,
  size_bytes integer not null default 0,
  caption text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.move_log (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  entity_type text not null check (entity_type in ('item', 'container')),
  entity_id text not null,
  from_container_id text,
  to_container_id text,
  from_location_id text,
  to_location_id text,
  notes text not null default '',
  moved_at timestamptz not null default now()
);

create table if not exists public.item_history (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  item_id text not null references public.items(id) on delete cascade,
  event_type text not null check (event_type in ('quantity_changed')),
  from_quantity integer,
  to_quantity integer,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.item_event_log (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  item_id text not null references public.items(id) on delete cascade,
  event_type text not null check (event_type in ('renamed', 'image_changed')),
  from_text text not null default '',
  to_text text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.container_event_log (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  container_id text not null references public.containers(id) on delete cascade,
  event_type text not null check (event_type in ('renamed', 'image_changed')),
  from_text text not null default '',
  to_text text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.container_activity_log (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  container_id text not null references public.containers(id) on delete cascade,
  item_id text,
  item_name text not null default '',
  action_type text not null check (action_type in ('item_added', 'item_removed', 'quantity_changed')),
  from_quantity integer,
  to_quantity integer,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.tags (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  token text not null unique,
  status text not null check (status in ('unassigned', 'assigned')),
  source text not null default 'generated' check (source in ('generated', 'external')),
  entity_type text check (entity_type in ('location', 'container', 'item')),
  entity_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_workspace_members_unique
  on public.workspace_members (workspace_id, user_id);

create index if not exists idx_locations_workspace
  on public.locations (workspace_id, name);

create index if not exists idx_containers_workspace_location
  on public.containers (workspace_id, location_id, name);

create index if not exists idx_items_workspace_container
  on public.items (workspace_id, container_id, name);

create index if not exists idx_photos_workspace_item
  on public.photos (workspace_id, item_id, created_at desc);

create index if not exists idx_item_history_item_created
  on public.item_history (workspace_id, item_id, created_at desc);

create index if not exists idx_item_event_log_item_created
  on public.item_event_log (workspace_id, item_id, created_at desc);

create index if not exists idx_container_event_log_container_created
  on public.container_event_log (workspace_id, container_id, created_at desc);

create index if not exists idx_container_activity_log_container_created
  on public.container_activity_log (workspace_id, container_id, created_at desc);

create index if not exists idx_tags_workspace_token
  on public.tags (workspace_id, token);

create index if not exists idx_tags_entity
  on public.tags (workspace_id, entity_type, entity_id);

create index if not exists idx_sessions_token
  on public.sessions (token);

create index if not exists idx_sessions_user
  on public.sessions (user_id, expires_at);

commit;
