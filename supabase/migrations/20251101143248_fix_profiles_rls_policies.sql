/*
  # Fix profiles RLS policies to use correct JWT path
  
  1. Changes
    - Drop existing policies that use incorrect JWT path
    - Recreate policies with correct `app_metadata` path
    - Ensure all authenticated users can view all profiles (needed for shift management)
  
  2. Security
    - Admins can do everything
    - Users can view all profiles (needed for weekly overview and shift assignments)
    - Users can only update their own profile
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Recreate SELECT policy - all authenticated users can view all profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT policy - only admins
CREATE POLICY "Admins can insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- UPDATE policy - admins can update any, users can update own
CREATE POLICY "Users can update profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR id = auth.uid()
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (
      id = auth.uid()
      AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    )
  );

-- DELETE policy - only admins
CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );