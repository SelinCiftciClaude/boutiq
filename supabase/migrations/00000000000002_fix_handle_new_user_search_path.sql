-- The original handle_new_user() trigger has SECURITY DEFINER but no SET search_path,
-- which (on current Supabase Postgres images) causes the function to run with an
-- empty search_path and fail with `relation "profiles" does not exist` whenever a
-- new auth user is inserted. Fully qualify the table reference and pin search_path.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;
