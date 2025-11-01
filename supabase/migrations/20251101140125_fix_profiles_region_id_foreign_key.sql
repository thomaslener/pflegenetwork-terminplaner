/*
  # Fix profiles.region_id foreign key constraint

  1. Changes
    - Drop the old foreign key constraint pointing to `regions` table
    - Add new foreign key constraint pointing to `districts` table
    - This aligns with the new data structure where employees belong to districts, not federal states
*/

-- Drop the old constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_region_id_fkey;

-- Add new constraint pointing to districts
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_region_id_fkey 
  FOREIGN KEY (region_id) 
  REFERENCES districts(id) 
  ON DELETE SET NULL;