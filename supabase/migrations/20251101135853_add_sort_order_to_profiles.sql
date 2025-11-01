/*
  # Add sort_order to profiles table

  1. Changes
    - Add `sort_order` column to `profiles` table with default value of 0
    - This allows ordering employees within regions for drag-and-drop functionality
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE profiles ADD COLUMN sort_order integer DEFAULT 0;
  END IF;
END $$;