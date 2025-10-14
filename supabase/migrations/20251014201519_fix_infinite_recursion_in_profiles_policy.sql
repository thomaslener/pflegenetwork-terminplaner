/*
  # Fix Infinite Recursion in Profiles Policy
  
  ## Overview
  This migration fixes the infinite recursion error in the profiles RLS policy
  by using a simpler approach that doesn't create circular dependencies.
  
  ## Changes
  - Drop the problematic policy "Employees can view colleagues in same federal state"
  - Create a simplified version that uses region_id directly without joining profiles to itself
  
  ## Important Notes
  - The policy now checks if the colleague's region shares the same federal_state_id
  - Uses a subquery to get the current user's federal_state_id without circular reference
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Employees can view colleagues in same federal state" ON profiles;

-- Create a fixed policy without circular dependency
CREATE POLICY "Employees can view colleagues in same federal state"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Allow viewing if the profile's region belongs to the same federal state as the current user
    profiles.region_id IN (
      SELECT r1.id 
      FROM regions r1
      WHERE r1.federal_state_id = (
        -- Get the current user's federal state
        SELECT r2.federal_state_id 
        FROM profiles p
        JOIN regions r2 ON p.region_id = r2.id
        WHERE p.id = auth.uid()
      )
      AND r1.federal_state_id IS NOT NULL
    )
  );
