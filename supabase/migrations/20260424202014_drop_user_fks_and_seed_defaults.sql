/*
  # Remove user FK constraints and seed a default site/profile

  Since the app no longer uses authentication, we remove the foreign key
  constraints that reference auth.users (profiles.id) to allow the app
  to function without any user accounts.

  We also add a default customer_id column default so inserts don't fail
  when no customer_id is available.
*/

-- Make customer_id and taken_by nullable / remove FK constraints that block anon inserts

ALTER TABLE sites DROP CONSTRAINT IF EXISTS sites_customer_id_fkey;
ALTER TABLE sites ALTER COLUMN customer_id SET DEFAULT '00000000-0000-0000-0000-000000000000';

ALTER TABLE pickups DROP CONSTRAINT IF EXISTS pickups_customer_id_fkey;
ALTER TABLE pickups ALTER COLUMN customer_id SET DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE pickups DROP CONSTRAINT IF EXISTS pickups_driver_id_fkey;

ALTER TABLE container_photos DROP CONSTRAINT IF EXISTS container_photos_taken_by_fkey;
ALTER TABLE container_photos ALTER COLUMN taken_by SET DEFAULT '00000000-0000-0000-0000-000000000000';

ALTER TABLE container_orders DROP CONSTRAINT IF EXISTS container_orders_customer_id_fkey;
ALTER TABLE container_orders ALTER COLUMN customer_id SET DEFAULT '00000000-0000-0000-0000-000000000000';

-- Seed a default site so customers can order containers immediately
INSERT INTO sites (id, customer_id, name, address, lat, lng)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'Main Job Site',
  '123 Main St',
  NULL,
  NULL
)
ON CONFLICT (id) DO NOTHING;
