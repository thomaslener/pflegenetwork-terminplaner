/*
  # Fix Districts RLS Policies
  
  1. Changes
    - Drop existing admin policies for districts that check JWT role
    - Create new policies that check the role from profiles table
    
  2. Security
    - Admins can perform all operations on districts
    - Employees can only read districts
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can insert districts" ON districts;
DROP POLICY IF EXISTS "Admins can update districts" ON districts;
DROP POLICY IF EXISTS "Admins can delete districts" ON districts;
DROP POLICY IF EXISTS "Admins can view all districts" ON districts;
DROP POLICY IF EXISTS "Employees can view districts" ON districts;

-- Create new policies that check profiles.role
CREATE POLICY "Admins can insert districts"
  ON districts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update districts"
  ON districts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete districts"
  ON districts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Everyone can view districts"
  ON districts FOR SELECT
  TO authenticated
  USING (true);
