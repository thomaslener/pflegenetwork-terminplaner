/*
  # Add sort_order to regions table
  
  1. Changes
    - Add sort_order column to regions table for ordering federal states
    
  2. Notes
    - Existing rows will get NULL values, which can be updated manually
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'regions' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE regions ADD COLUMN sort_order integer;
  END IF;
END $$;
