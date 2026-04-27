create table if not exists referral_codes (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  owner_user_id uuid not null references profiles(id) on delete cascade,
  uses integer not null default 0,
  created_at timestamptz default now()
);
alter table referral_codes enable row level security;
create policy "Users read own code" on referral_codes for select using (auth.uid() = owner_user_id);
create policy "Anyone can look up a code" on referral_codes for select using (true);

create table if not exists referral_uses (
  id uuid primary key default uuid_generate_v4(),
  code text not null references referral_codes(code),
  referred_user_id uuid not null references profiles(id) on delete cascade unique,
  created_at timestamptz default now()
);
alter table referral_uses enable row level security;
create policy "Users read own referral use" on referral_uses for select using (auth.uid() = referred_user_id);

create index idx_referral_codes_owner on referral_codes(owner_user_id);
