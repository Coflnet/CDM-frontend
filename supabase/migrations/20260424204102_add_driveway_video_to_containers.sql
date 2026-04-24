/*
  # Add driveway_video_url to containers

  Stores the driveway path video recorded at order time so drivers
  can reference it when navigating to the container location.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'containers' AND column_name = 'driveway_video_url'
  ) THEN
    ALTER TABLE containers ADD COLUMN driveway_video_url text DEFAULT '';
  END IF;
END $$;
