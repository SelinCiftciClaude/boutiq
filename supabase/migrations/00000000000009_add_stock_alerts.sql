create table if not exists stock_alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz default now(),
  notified_at timestamptz,
  unique (user_id, product_id)
);
alter table stock_alerts enable row level security;
create policy "Users manage own stock alerts" on stock_alerts for all using (auth.uid() = user_id);
create index idx_stock_alerts_product on stock_alerts(product_id);
