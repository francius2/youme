create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;

insert into public.profiles (id, email, display_name)
select users.id, users.email, coalesce(users.raw_user_meta_data ->> 'display_name', users.email)
from auth.users as users
on conflict (id) do update
set email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) > 0),
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_conversation_member(target_conversation_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members
    where conversation_id = target_conversation_id
      and user_id = target_user_id
  );
$$;

revoke execute on function public.is_conversation_member(uuid, uuid) from public;
grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;

create or replace function public.create_conversation(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_conversation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a conversation';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'You cannot start a conversation with yourself';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'That user does not exist';
  end if;

  insert into public.conversations default values
  returning id into new_conversation_id;

  insert into public.conversation_members (conversation_id, user_id)
  values (new_conversation_id, auth.uid()), (new_conversation_id, target_user_id);

  return new_conversation_id;
end;
$$;

revoke execute on function public.create_conversation(uuid) from public;
grant execute on function public.create_conversation(uuid) to authenticated;

drop policy if exists "Users can view their profile" on public.profiles;
create policy "Users can view their profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Members can view profiles in their conversations" on public.profiles;
create policy "Members can view profiles in their conversations"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.conversation_members as profile_membership
      where profile_membership.user_id = profiles.id
        and public.is_conversation_member(profile_membership.conversation_id, auth.uid())
    )
  );

drop policy if exists "Authenticated users can search profiles" on public.profiles;
create policy "Authenticated users can search profiles"
  on public.profiles for select
  using (auth.uid() is not null);

drop policy if exists "Members can view their conversations" on public.conversations;
drop policy if exists "Users can create conversations" on public.conversations;
create policy "Users can create conversations"
  on public.conversations for insert
  with check (auth.uid() is not null);
create policy "Members can view their conversations"
  on public.conversations for select
  using (
    public.is_conversation_member(conversations.id, auth.uid())
  );

drop policy if exists "Members can view conversation members" on public.conversation_members;
drop policy if exists "Users can add conversation members" on public.conversation_members;
create policy "Users can add conversation members"
  on public.conversation_members for insert
  with check (
    user_id = auth.uid()
    or public.is_conversation_member(conversation_members.conversation_id, auth.uid())
  );
create policy "Members can view conversation members"
  on public.conversation_members for select
  using (
    public.is_conversation_member(conversation_members.conversation_id, auth.uid())
  );

drop policy if exists "Members can view messages" on public.messages;
create policy "Members can view messages"
  on public.messages for select
  using (
    public.is_conversation_member(messages.conversation_id, auth.uid())
  );

drop policy if exists "Members can send messages" on public.messages;
create policy "Members can send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(messages.conversation_id, auth.uid())
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', new.email))
  on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(public.profiles.display_name, excluded.display_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();