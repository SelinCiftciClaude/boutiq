create table if not exists device_tokens (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references profiles(id) on delete cascade,
  token        text not null,
  platform     text not null check (platform in ('ios','android','web')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (user_id, platform)
);

alter table device_tokens enable row level security;

create policy "Users manage own device tokens"
  on device_tokens for all
  using (auth.uid() = user_id);

create index idx_device_tokens_user on device_tokens(user_id);
