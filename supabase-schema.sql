-- 在 Supabase SQL Editor 中执行一次。
create table if not exists public.papers (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default '待确认',
  type text not null default 'PDF',
  status text not null default '未开始',
  summary text,
  file_path text,
  created_at timestamptz not null default now()
);

alter table public.papers enable row level security;

create policy "Users can read their own papers" on public.papers
  for select using (auth.uid() = user_id);
create policy "Users can insert their own papers" on public.papers
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own papers" on public.papers
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own papers" on public.papers
  for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('papers', 'papers', false)
on conflict (id) do nothing;

create policy "Users can read their own paper files" on storage.objects
  for select using (bucket_id = 'papers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can upload their own paper files" on storage.objects
  for insert with check (bucket_id = 'papers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can update their own paper files" on storage.objects
  for update using (bucket_id = 'papers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can delete their own paper files" on storage.objects
  for delete using (bucket_id = 'papers' and (storage.foldername(name))[1] = auth.uid()::text);
