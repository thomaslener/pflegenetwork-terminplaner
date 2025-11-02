/*
  # Add open_shift column to shifts table

  1. Changes
    - Add `open_shift` (boolean) column to `shifts` table
    - Default value is false
    - Indicates whether a shift is an open shift (not yet assigned to a specific employee)
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shifts' AND column_name = 'open_shift'
  ) THEN
    ALTER TABLE shifts ADD COLUMN open_shift boolean DEFAULT false;
  END IF;
END $$;