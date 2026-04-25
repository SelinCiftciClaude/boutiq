create table if not exists notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  type        text not null check (type in ('campaign','shipment','newArrival','priceDrop','system')),
  title       text not null,
  body        text not null,
  data        jsonb default '{}',
  is_read     boolean default false,
  created_at  timestamptz default now()
);

alter table notifications enable row level security;

create policy "Users manage own notifications"
  on notifications for all
  using (auth.uid() = user_id);

create index idx_notifications_user on notifications(user_id, created_at desc);
create index idx_notifications_unread on notifications(user_id, is_read) where is_read = false;
