/*
  # Remove All Federal State Policies
  
  ## Overview
  This migration removes ALL federal state-based policies that cause infinite recursion.
  The federal state visibility will be handled at the application level instead.
  
  ## Changes
  - Remove "Employees can view regions in their federal state" from regions table
  - Remove "Employees can view shifts in their federal state" from shifts table
  - Remove "Employees can take over open shifts in their federal state" from shifts table
  - Remove "Employees can take over replacement shifts in their federal state" from shifts table
  
  ## Important Notes
  - Basic policies remain: users can view their own data, admins can view all data
  - This ensures login and basic functionality works without recursion errors
  - Cross-region visibility will be implemented in the frontend
*/

-- Remove regions policy
DROP POLICY IF EXISTS "Employees can view regions in their federal state" ON regions;

-- Remove all shifts federal state policies
DROP POLICY IF EXISTS "Employees can view shifts in their federal state" ON shifts;
DROP POLICY IF EXISTS "Employees can take over open shifts in their federal state" ON shifts;
DROP POLICY IF EXISTS "Employees can take over replacement shifts in their federal state" ON shifts;

-- Keep the simple replacement shift policy without federal state check
CREATE POLICY "Employees can take over replacement shifts"
  ON shifts FOR UPDATE
  TO authenticated
  USING (seeking_replacement = true)
  WITH CHECK (
    employee_id = auth.uid() 
    AND seeking_replacement = false
  );

-- Keep the simple open shift policy without federal state check
CREATE POLICY "Employees can take over open shifts"
  ON shifts FOR UPDATE
  TO authenticated
  USING (
    open_shift = true 
    AND employee_id IS NULL
  )
  WITH CHECK (
    employee_id = auth.uid() 
    AND open_shift = false
  );
