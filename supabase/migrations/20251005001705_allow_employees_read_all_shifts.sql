/*
  # Allow Employees to Read All Shifts
  
  This migration allows employees to view all shifts in read-only mode
  for the weekly overview feature.
  
  ## Changes
  - Add new policy to allow authenticated employees to view all shifts
*/

-- Allow all authenticated users to view all shifts
CREATE POLICY "Employees can view all shifts"
  ON shifts FOR SELECT
  TO authenticated
  USING (true);
