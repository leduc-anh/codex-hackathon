create table if not exists public.sopilot_smoke_tests (
  id uuid primary key,
  kind text not null check (kind = 'codex-live-smoke'),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.sopilot_smoke_tests enable row level security;

drop policy if exists "sopilot smoke insert" on public.sopilot_smoke_tests;
create policy "sopilot smoke insert"
  on public.sopilot_smoke_tests
  for insert
  to anon
  with check (kind = 'codex-live-smoke');

drop policy if exists "sopilot smoke select" on public.sopilot_smoke_tests;
create policy "sopilot smoke select"
  on public.sopilot_smoke_tests
  for select
  to anon
  using (kind = 'codex-live-smoke');
