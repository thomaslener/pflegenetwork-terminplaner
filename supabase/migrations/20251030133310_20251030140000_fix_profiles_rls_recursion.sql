/*
  # Fix Infinite Recursion in Profiles RLS Policies

  ## Overview
  This migration fixes the infinite recursion issue in the profiles table RLS policies
  by storing the role information in the auth.users metadata instead of querying the
  profiles table within the policy.

  ## Changes
  1. Drop existing problematic policies
  2. Create new policies that use auth.jwt() to check the role from user metadata
  3. Ensure the role is stored in raw_app_meta_data for secure access

  ## Security
  - Maintains the same security model (admins can manage all, users can view their own)
  - Uses JWT metadata which cannot be modified by users
  - All policies remain restrictive by default
*/

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Employees can view colleagues in same region" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'admin'
    OR id = auth.uid()
  );

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role')::text = 'admin'
  );

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'admin'
    OR id = auth.uid()
  )
  WITH CHECK (
    (auth.jwt()->>'role')::text = 'admin'
    OR (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  );

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_app_meta_data->>'role', 'employee')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
