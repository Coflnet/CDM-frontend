/*
  # Add policies for authenticated role on all tables

  The app uses the anon key but Supabase may resolve requests as the
  authenticated role depending on context. Adding permissive policies
  for authenticated role on all tables to ensure inserts/reads always work.
*/

-- sites
CREATE POLICY "Authenticated can read sites"
  ON sites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sites"
  ON sites FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update sites"
  ON sites FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- containers
CREATE POLICY "Authenticated can read containers"
  ON containers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert containers"
  ON containers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update containers"
  ON containers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- pickups
CREATE POLICY "Authenticated can read pickups"
  ON pickups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert pickups"
  ON pickups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update pickups"
  ON pickups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- container_photos
CREATE POLICY "Authenticated can read container photos"
  ON container_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert container photos"
  ON container_photos FOR INSERT TO authenticated WITH CHECK (true);

-- container_orders
CREATE POLICY "Authenticated can read orders"
  ON container_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert orders"
  ON container_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update orders"
  ON container_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- profiles
CREATE POLICY "Authenticated can read all profiles"
  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert profiles"
  ON profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update profiles"
  ON profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
