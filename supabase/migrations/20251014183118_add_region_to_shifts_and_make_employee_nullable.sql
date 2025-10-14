/*
  # Add region to shifts and make employee_id nullable

  1. Changes
    - Add `region_id` column to `shifts` table to associate open shifts with regions
    - Make `employee_id` nullable to support open shifts without assigned employees
    - Update foreign key constraint for region_id
    
  2. Security
    - Update RLS policies to handle open shifts (null employee_id)
    - Open shifts should be visible to users in the same region
*/

-- Add region_id column to shifts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'shifts'
      AND column_name = 'region_id'
  ) THEN
    ALTER TABLE shifts
      ADD COLUMN region_id uuid REFERENCES regions(id);
  END IF;
END $$;

-- Make employee_id nullable for open shifts
ALTER TABLE shifts
  ALTER COLUMN employee_id DROP NOT NULL;

-- Update comment
COMMENT ON COLUMN shifts.employee_id IS 'Employee assigned to this shift. NULL for open shifts.';
COMMENT ON COLUMN shifts.region_id IS 'Region for open shifts. Required when open_shift is true.';

-- Drop and recreate the existing "Employees can view all shifts" policy to handle open shifts
DROP POLICY IF EXISTS "Employees can view all shifts" ON shifts;

-- Create new policy that allows employees to see open shifts in their region
CREATE POLICY "Employees can view shifts in their region"
  ON shifts
  FOR SELECT
  TO authenticated
  USING (
    -- Employees can see all assigned shifts (backward compatibility)
    employee_id IS NOT NULL
    OR
    -- Employees can see open shifts in their own region
    (
      open_shift = true 
      AND region_id IN (
        SELECT region_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
    )
  );
