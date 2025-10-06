/*
  # Add sort order to regions

  1. Changes
    - Add `sort_order` column to `regions` table
    - Set default values for existing regions based on name
    - Add index for performance

  2. Notes
    - Existing regions will be numbered sequentially
    - New regions will be added at the end by default
*/

-- Add sort_order column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'regions' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE regions ADD COLUMN sort_order integer DEFAULT 0;
  END IF;
END $$;

-- Set sort_order for existing regions based on alphabetical order
WITH numbered_regions AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) as row_num
  FROM regions
)
UPDATE regions
SET sort_order = numbered_regions.row_num
FROM numbered_regions
WHERE regions.id = numbered_regions.id
AND regions.sort_order = 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_regions_sort_order ON regions(sort_order);
