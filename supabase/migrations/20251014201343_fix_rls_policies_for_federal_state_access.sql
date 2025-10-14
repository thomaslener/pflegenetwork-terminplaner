/*
  # Fix RLS Policies for Federal State Access
  
  ## Overview
  This migration updates RLS policies so that employees can view shifts and data
  from their entire federal state (Bundesland), not just their own region.
  
  ## Changes
  
  ### 1. Shifts Table
  - Drop old region-based policy "Employees can view shifts in their region"
  - Create new federal state-based policy that allows employees to see:
    - All shifts where employee is in the same federal state
    - All open shifts in regions of the same federal state
  
  ### 2. Regions Table
  - Update policy so employees can view all regions in their federal state
  
  ### 3. Profiles Table
  - Update policy so employees can view all profiles in their federal state
  
  ## Important Notes
  - This enables cross-region visibility within the same federal state
  - Maintains security by restricting access to federal state boundaries
  - Allows proper display of replacement shifts and open shifts across the federal state
*/

-- Drop old region-based policy for shifts
DROP POLICY IF EXISTS "Employees can view shifts in their region" ON shifts;

-- Create new federal state-based policy for viewing shifts
CREATE POLICY "Employees can view shifts in their federal state"
  ON shifts FOR SELECT
  TO authenticated
  USING (
    -- Allow if shift employee is in same federal state
    (employee_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM profiles p1
      JOIN regions r1 ON p1.region_id = r1.id
      JOIN profiles p2 ON p2.id = auth.uid()
      JOIN regions r2 ON p2.region_id = r2.id
      WHERE p1.id = shifts.employee_id
      AND r1.federal_state_id = r2.federal_state_id
      AND r1.federal_state_id IS NOT NULL
    ))
    OR
    -- Allow if open shift in region of same federal state
    (open_shift = true AND employee_id IS NULL AND EXISTS (
      SELECT 1 FROM regions r1
      JOIN profiles p ON p.id = auth.uid()
      JOIN regions r2 ON p.region_id = r2.id
      WHERE r1.id = shifts.region_id
      AND r1.federal_state_id = r2.federal_state_id
      AND r1.federal_state_id IS NOT NULL
    ))
  );

-- Drop old region policy for regions table
DROP POLICY IF EXISTS "Employees can view their region" ON regions;

-- Create new federal state-based policy for viewing regions
CREATE POLICY "Employees can view regions in their federal state"
  ON regions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN regions r ON p.region_id = r.id
      WHERE p.id = auth.uid()
      AND r.federal_state_id = regions.federal_state_id
      AND r.federal_state_id IS NOT NULL
    )
  );

-- Drop old region-based policy for profiles
DROP POLICY IF EXISTS "Employees can view colleagues in same region" ON profiles;

-- Create new federal state-based policy for viewing profiles
CREATE POLICY "Employees can view colleagues in same federal state"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN regions r1 ON p1.region_id = r1.id
      JOIN regions r2 ON profiles.region_id = r2.id
      WHERE p1.id = auth.uid()
      AND r1.federal_state_id = r2.federal_state_id
      AND r1.federal_state_id IS NOT NULL
    )
  );

-- Update the policy for taking over open shifts to use federal state
DROP POLICY IF EXISTS "Employees can take over open shifts" ON shifts;

CREATE POLICY "Employees can take over open shifts in their federal state"
  ON shifts FOR UPDATE
  TO authenticated
  USING (
    open_shift = true 
    AND employee_id IS NULL 
    AND EXISTS (
      SELECT 1 FROM regions r1
      JOIN profiles p ON p.id = auth.uid()
      JOIN regions r2 ON p.region_id = r2.id
      WHERE r1.id = shifts.region_id
      AND r1.federal_state_id = r2.federal_state_id
      AND r1.federal_state_id IS NOT NULL
    )
  )
  WITH CHECK (
    employee_id = auth.uid() 
    AND open_shift = false
  );

-- Update the policy for taking over replacement shifts to use federal state
DROP POLICY IF EXISTS "Employees can take over replacement shifts" ON shifts;

CREATE POLICY "Employees can take over replacement shifts in their federal state"
  ON shifts FOR UPDATE
  TO authenticated
  USING (
    seeking_replacement = true
    AND EXISTS (
      SELECT 1 FROM profiles p1
      JOIN regions r1 ON p1.region_id = r1.id
      JOIN profiles p2 ON p2.id = auth.uid()
      JOIN regions r2 ON p2.region_id = r2.id
      WHERE p1.id = shifts.employee_id
      AND r1.federal_state_id = r2.federal_state_id
      AND r1.federal_state_id IS NOT NULL
    )
  )
  WITH CHECK (
    employee_id = auth.uid() 
    AND seeking_replacement = false
  );
