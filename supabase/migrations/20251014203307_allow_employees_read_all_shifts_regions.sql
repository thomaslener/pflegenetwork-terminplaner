/*
  # Allow Employees to Read All Shifts and Regions
  
  ## Overview
  This migration fixes the RLS policies to allow employees to:
  - View all shifts (for weekly overview and replacement requests)
  - View all regions (for filtering and display)
  
  ## Changes Made
  
  ### Shifts Table
  - Add policy "Employees can view all shifts" for SELECT operations
  - This allows employees to see:
    - Their own shifts
    - Shifts seeking replacement
    - Open shifts
    - All other shifts for the weekly overview
  
  ### Regions Table
  - Add policy "Employees can view all regions" for SELECT operations
  - This allows employees to see all regions for filtering
  
  ## Important Notes
  - Employees can only modify their own shifts
  - Admins retain full access to everything
  - This is necessary for the weekly overview and replacement features to work
*/

-- Drop the restrictive "Employees can view own shifts" policy
DROP POLICY IF EXISTS "Employees can view own shifts" ON shifts;

-- Add policy allowing employees to view all shifts
CREATE POLICY "Employees can view all shifts"
  ON shifts FOR SELECT
  TO authenticated
  USING (true);

-- Add policy allowing employees to view all regions
CREATE POLICY "Employees can view all regions"
  ON regions FOR SELECT
  TO authenticated
  USING (true);
