/*
  # Add sort order to profiles

  1. Changes
    - Add `sort_order` column to `profiles` table
    - Set default values for existing profiles based on full_name within each region
    - Add index for performance

  2. Notes
    - Profiles will be numbered sequentially within their region
    - New profiles will be added at the end of their region by default
*/

-- Add sort_order column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE profiles ADD COLUMN sort_order integer DEFAULT 0;
  END IF;
END $$;

-- Set sort_order for existing profiles based on alphabetical order within each region
WITH numbered_profiles AS (
  SELECT 
    id, 
    ROW_NUMBER() OVER (PARTITION BY region_id ORDER BY full_name) as row_num
  FROM profiles
)
UPDATE profiles
SET sort_order = numbered_profiles.row_num
FROM numbered_profiles
WHERE profiles.id = numbered_profiles.id
AND profiles.sort_order = 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_sort_order ON profiles(region_id, sort_order);
