create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique (user_id, brand_id)
);
alter table reviews enable row level security;
create policy "Users read all reviews" on reviews for select using (true);
create policy "Users manage own review" on reviews for all using (auth.uid() = user_id);
create index idx_reviews_brand on reviews(brand_id);
