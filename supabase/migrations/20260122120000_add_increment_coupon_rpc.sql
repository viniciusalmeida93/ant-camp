create or replace function increment_coupon_usage(coupon_id uuid)
returns void as $$
begin
  update public.coupons
  set used_count = used_count + 1
  where id = coupon_id;
end;
$$ language plpgsql security definer;
