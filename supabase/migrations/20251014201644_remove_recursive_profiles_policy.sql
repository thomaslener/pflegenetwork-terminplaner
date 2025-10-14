/*
  # Remove Recursive Profiles Policy
  
  ## Overview
  This migration removes the problematic "Employees can view colleagues in same federal state" policy
  that causes infinite recursion when trying to load a user's own profile.
  
  ## Changes
  - Drop the policy "Employees can view colleagues in same federal state"
  - Keep only the essential policies:
    - Users can view their own profile
    - Admins can view all profiles
  
  ## Important Notes
  - The federal state visibility will be handled at the application level
  - The "Users can view own profile" policy is sufficient for login to work
  - Admin policies remain unchanged for full access
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Employees can view colleagues in same federal state" ON profiles;

-- Also remove any overly permissive policies that might have been added
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can delete profiles" ON profiles;
