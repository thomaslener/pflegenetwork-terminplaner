/*
  # Add seeking replacement feature to shifts

  1. Changes
    - Add `seeking_replacement` column to shifts table
      - Boolean field to track if a shift is looking for a replacement
      - Defaults to false
    - Add index on seeking_replacement for faster queries

  2. Security
    - No RLS changes needed - existing policies cover this field
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shifts' AND column_name = 'seeking_replacement'
  ) THEN
    ALTER TABLE shifts ADD COLUMN seeking_replacement boolean DEFAULT false NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shifts_seeking_replacement ON shifts(seeking_replacement) WHERE seeking_replacement = true;