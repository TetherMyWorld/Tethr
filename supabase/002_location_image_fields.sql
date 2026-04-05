begin;

alter table if exists public.locations
  add column if not exists image_file_name text not null default '';

alter table if exists public.locations
  add column if not exists image_stored_name text not null default '';

alter table if exists public.locations
  add column if not exists image_mime_type text not null default '';

alter table if exists public.locations
  add column if not exists image_size_bytes integer not null default 0;

commit;
