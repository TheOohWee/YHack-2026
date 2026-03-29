-- ============================================================
-- WattsUp v2: Profile enhancements + Friends system
-- Run this in the Supabase SQL Editor AFTER v1 migration
-- ============================================================

-- 1. Add bio and updated_at to profiles
alter table public.profiles
  add column if not exists bio text default '' check (char_length(bio) <= 200),
  add column if not exists updated_at timestamptz default now();

-- 2. Friend requests table
create table if not exists public.friend_requests (
  id         uuid primary key default gen_random_uuid(),
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now(),
  constraint no_self_request check (sender_id <> receiver_id),
  constraint unique_active_request unique (sender_id, receiver_id)
);

create index if not exists idx_fr_sender on public.friend_requests(sender_id);
create index if not exists idx_fr_receiver on public.friend_requests(receiver_id);
create index if not exists idx_fr_status on public.friend_requests(status);

-- 3. Enable RLS on friend_requests
alter table public.friend_requests enable row level security;

-- Policies for friend_requests
create policy "Users can view own friend requests"
  on public.friend_requests for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send friend requests"
  on public.friend_requests for insert
  with check (auth.uid() = sender_id);

create policy "Receiver can update friend requests"
  on public.friend_requests for update
  using (auth.uid() = receiver_id);

create policy "Either party can delete friend requests"
  on public.friend_requests for delete
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- 4. Allow users to read other profiles (for friends/search)
-- Drop the old restrictive policy if it exists, then create a broader one
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Authenticated users can read profiles"
  on public.profiles for select
  using (auth.uid() is not null);

-- 5. Storage bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');
