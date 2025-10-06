/*
  # Allow employees to take over replacement shifts

  ## Changes
  - Add new policy allowing employees to update shifts marked as seeking_replacement
  - This enables the "Vertretung übernehmen" functionality

  ## Security
  - Only authenticated employees can take over shifts
  - Only shifts explicitly marked with seeking_replacement = true can be taken over
  - The employee can change the employee_id to themselves and set seeking_replacement to false
*/

-- Allow employees to take over shifts that are seeking replacement
CREATE POLICY "Employees can take over replacement shifts"
  ON shifts FOR UPDATE
  TO authenticated
  USING (seeking_replacement = true)
  WITH CHECK (employee_id = auth.uid() AND seeking_replacement = false);
