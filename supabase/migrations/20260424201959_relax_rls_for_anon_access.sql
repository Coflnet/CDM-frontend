/*
  # Relax RLS policies for anonymous access

  Since the app no longer uses authentication, all tables need to be accessible
  by the anon role. We drop the old authenticated-only policies and add
  permissive anon policies for all operations needed by the app.
*/

-- Drop old policies and replace with anon-accessible ones

-- profiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Drivers can read all profiles" ON profiles;

CREATE POLICY "Anon can read profiles" ON profiles FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert profiles" ON profiles FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update profiles" ON profiles FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- sites
DROP POLICY IF EXISTS "Customers can read own sites" ON sites;
DROP POLICY IF EXISTS "Customers can insert own sites" ON sites;
DROP POLICY IF EXISTS "Customers can update own sites" ON sites;
DROP POLICY IF EXISTS "Drivers can read all sites" ON sites;

CREATE POLICY "Anon can read sites" ON sites FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert sites" ON sites FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update sites" ON sites FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- containers
DROP POLICY IF EXISTS "Customers can read containers at own sites" ON containers;
DROP POLICY IF EXISTS "Customers can insert containers at own sites" ON containers;
DROP POLICY IF EXISTS "Customers can update containers at own sites" ON containers;
DROP POLICY IF EXISTS "Drivers can read all containers" ON containers;
DROP POLICY IF EXISTS "Drivers can update all containers" ON containers;

CREATE POLICY "Anon can read containers" ON containers FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert containers" ON containers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update containers" ON containers FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- pickups
DROP POLICY IF EXISTS "Customers can read own pickups" ON pickups;
DROP POLICY IF EXISTS "Customers can insert own pickups" ON pickups;
DROP POLICY IF EXISTS "Customers can update own pickups" ON pickups;
DROP POLICY IF EXISTS "Drivers can read all pickups" ON pickups;
DROP POLICY IF EXISTS "Drivers can update pickups" ON pickups;

CREATE POLICY "Anon can read pickups" ON pickups FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert pickups" ON pickups FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update pickups" ON pickups FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- container_photos
DROP POLICY IF EXISTS "Customers can read photos of own containers" ON container_photos;
DROP POLICY IF EXISTS "Customers can insert photos of own containers" ON container_photos;
DROP POLICY IF EXISTS "Drivers can read all container photos" ON container_photos;

CREATE POLICY "Anon can read container photos" ON container_photos FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert container photos" ON container_photos FOR INSERT TO anon WITH CHECK (true);

-- container_orders
DROP POLICY IF EXISTS "Customers can read own orders" ON container_orders;
DROP POLICY IF EXISTS "Customers can insert own orders" ON container_orders;
DROP POLICY IF EXISTS "Drivers can read all orders" ON container_orders;
DROP POLICY IF EXISTS "Drivers can update all orders" ON container_orders;

CREATE POLICY "Anon can read orders" ON container_orders FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert orders" ON container_orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update orders" ON container_orders FOR UPDATE TO anon USING (true) WITH CHECK (true);
