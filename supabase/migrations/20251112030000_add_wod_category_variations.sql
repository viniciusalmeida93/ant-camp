create table if not exists public.wod_category_variations (
  id uuid primary key default gen_random_uuid(),
  wod_id uuid not null references public.wods(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  display_name text,
  description text,
  time_cap text,
  notes text,
  estimated_duration_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wod_category_variations_wod_category_unique unique (wod_id, category_id)
);

create trigger set_wod_category_variations_updated_at
  before update on public.wod_category_variations
  for each row
  execute function public.set_updated_at();

