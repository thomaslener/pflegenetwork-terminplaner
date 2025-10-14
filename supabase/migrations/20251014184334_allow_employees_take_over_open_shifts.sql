/*
  # Allow employees to take over open shifts

  1. Changes
    - Add policy to allow authenticated employees to update open shifts
    - Open shifts have employee_id = NULL and open_shift = true
    - Employees can claim these shifts by setting employee_id to their own ID
    
  2. Security
    - Only authenticated users can take over open shifts
    - The shift must be in the employee's region (checked via region_id)
    - After takeover, employee_id must be set to the claiming user
*/

-- Create policy for employees to take over open shifts
CREATE POLICY "Employees can take over open shifts"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (
    -- Can update if it's an open shift with no employee assigned
    open_shift = true 
    AND employee_id IS NULL
    AND region_id IN (
      SELECT region_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    -- After update, the shift must be assigned to the current user
    employee_id = auth.uid() 
    AND open_shift = false
  );
