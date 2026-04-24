/*
  # CDM (Container/Dumpster Management) Schema

  ## Overview
  This migration creates the full schema for a container management company app
  with two user roles: customer and driver.

  ## New Tables

  ### profiles
  - Stores user role (customer or driver) linked to auth.users

  ### sites
  - A job site belonging to a customer (e.g., a drywall job location)
  - Columns: id, customer_id, name, address, lat, lng, created_at

  ### containers
  - A physical container at a site
  - Columns: id, site_id, container_type, fill_state (0-100), status, delivered_at, pickup_date, created_at

  ### pickups
  - A scheduled pickup request for a container
  - Columns: id, container_id, site_id, customer_id, scheduled_at, status, driveway_video_url, driver_id, driver_eta, driver_started_at, created_at

  ### container_photos
  - Photos of fill state for a container
  - Columns: id, container_id, photo_url, fill_state, taken_by, created_at

  ### container_orders
  - Customer orders for new containers
  - Columns: id, customer_id, site_id, container_type, quantity, notes, status, created_at

  ## Security
  - RLS enabled on all tables
  - Customers can only access their own data
  - Drivers can read all site/container/pickup data and update pickups they're assigned to
*/

-- profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'driver')),
  phone text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Drivers can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'driver'
    )
  );

-- sites table
CREATE TABLE IF NOT EXISTS sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  lat double precision,
  lng double precision,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own sites"
  ON sites FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can insert own sites"
  ON sites FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update own sites"
  ON sites FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Drivers can read all sites"
  ON sites FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'driver'
    )
  );

-- containers table
CREATE TABLE IF NOT EXISTS containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  container_type text NOT NULL DEFAULT '10yd',
  fill_state integer NOT NULL DEFAULT 0 CHECK (fill_state >= 0 AND fill_state <= 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'scheduled_pickup', 'picked_up', 'ordered')),
  delivered_at timestamptz DEFAULT now(),
  pickup_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE containers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read containers at own sites"
  ON containers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sites s WHERE s.id = site_id AND s.customer_id = auth.uid()
    )
  );

CREATE POLICY "Customers can insert containers at own sites"
  ON containers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites s WHERE s.id = site_id AND s.customer_id = auth.uid()
    )
  );

CREATE POLICY "Customers can update containers at own sites"
  ON containers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sites s WHERE s.id = site_id AND s.customer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites s WHERE s.id = site_id AND s.customer_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can read all containers"
  ON containers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'driver'
    )
  );

CREATE POLICY "Drivers can update all containers"
  ON containers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'driver'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'driver'
    )
  );

-- pickups table
CREATE TABLE IF NOT EXISTS pickups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id uuid NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'driver_en_route', 'completed', 'cancelled')),
  driveway_video_url text DEFAULT '',
  driver_id uuid REFERENCES profiles(id),
  driver_eta timestamptz,
  driver_started_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pickups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own pickups"
  ON pickups FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can insert own pickups"
  ON pickups FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update own pickups"
  ON pickups FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Drivers can read all pickups"
  ON pickups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'driver'
    )
  );

CREATE POLICY "Drivers can update pickups"
  ON pickups FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'driver'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'driver'
    )
  );

-- container_photos table
CREATE TABLE IF NOT EXISTS container_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id uuid NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
  photo_url text NOT NULL DEFAULT '',
  fill_state integer DEFAULT 0 CHECK (fill_state >= 0 AND fill_state <= 100),
  taken_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE container_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read photos of own containers"
  ON container_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM containers c
      JOIN sites s ON s.id = c.site_id
      WHERE c.id = container_id AND s.customer_id = auth.uid()
    )
  );

CREATE POLICY "Customers can insert photos of own containers"
  ON container_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    taken_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM containers c
      JOIN sites s ON s.id = c.site_id
      WHERE c.id = container_id AND s.customer_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can read all container photos"
  ON container_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'driver'
    )
  );

-- container_orders table
CREATE TABLE IF NOT EXISTS container_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  container_type text NOT NULL DEFAULT '10yd',
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE container_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own orders"
  ON container_orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can insert own orders"
  ON container_orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Drivers can read all orders"
  ON container_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'driver'
    )
  );

CREATE POLICY "Drivers can update all orders"
  ON container_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'driver'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'driver'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sites_customer ON sites(customer_id);
CREATE INDEX IF NOT EXISTS idx_containers_site ON containers(site_id);
CREATE INDEX IF NOT EXISTS idx_pickups_customer ON pickups(customer_id);
CREATE INDEX IF NOT EXISTS idx_pickups_site ON pickups(site_id);
CREATE INDEX IF NOT EXISTS idx_pickups_status ON pickups(status);
CREATE INDEX IF NOT EXISTS idx_pickups_scheduled ON pickups(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_container_orders_customer ON container_orders(customer_id);
