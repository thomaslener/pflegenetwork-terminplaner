/*
  # Allow Employees to View All Profiles
  
  ## Overview
  This migration fixes the RLS policy for profiles to allow employees to view all profiles.
  This is necessary for:
  - Weekly overview (showing all employees in same federal state)
  - Shift management (seeing who is assigned to shifts)
  - Replacement requests (seeing who needs a replacement)
  
  ## Changes Made
  
  ### Profiles Table
  - Drop the restrictive "Users can view own profile" policy
  - Add new policy "Authenticated users can view all profiles" for SELECT operations
  - This allows all authenticated users to see all profiles
  - Users can still only update their own profile
  
  ## Security Notes
  - This is safe because profile information (names, regions) is needed for collaboration
  - Update permissions remain restricted to own profile
  - Only authenticated users can view profiles
*/

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Add policy allowing authenticated users to view all profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);
