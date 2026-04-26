create or replace view popular_brands_week as
  select brand_id, count(*) as save_count
  from user_brands
  where created_at >= now() - interval '7 days'
  group by brand_id
  order by save_count desc
  limit 10;

create or replace view popular_products_week as
  select product_id, count(*) as save_count
  from saved_products
  where saved_at >= now() - interval '7 days'
  group by product_id
  order by save_count desc
  limit 10;
