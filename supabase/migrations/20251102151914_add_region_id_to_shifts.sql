/*
  # Add region_id column to shifts table

  1. Changes
    - Add `region_id` (uuid) column to `shifts` table
    - Add foreign key constraint to regions table
    - Column is nullable to support both assigned and open shifts
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shifts' AND column_name = 'region_id'
  ) THEN
    ALTER TABLE shifts ADD COLUMN region_id uuid REFERENCES regions(id);
  END IF;
END $$;