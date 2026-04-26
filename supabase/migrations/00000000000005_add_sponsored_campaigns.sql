alter table campaigns add column if not exists is_sponsored boolean not null default false;

create index if not exists idx_campaigns_sponsored on campaigns(is_sponsored) where is_sponsored = true;
