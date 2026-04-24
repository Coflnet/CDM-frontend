/*
  # Create Storage Buckets

  Creates two public storage buckets:
  - driveway-videos: for customer driveway walk-through videos
  - container-photos: for fill state photos of containers

  Also sets up permissive storage policies for authenticated users.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('driveway-videos', 'driveway-videos', true, 104857600, ARRAY['video/webm', 'video/mp4', 'video/quicktime']),
  ('container-photos', 'container-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload driveway videos' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Authenticated users can upload driveway videos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'driveway-videos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view driveway videos' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Anyone can view driveway videos"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'driveway-videos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload container photos' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Authenticated users can upload container photos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'container-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view container photos' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Anyone can view container photos"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'container-photos');
  END IF;
END $$;
