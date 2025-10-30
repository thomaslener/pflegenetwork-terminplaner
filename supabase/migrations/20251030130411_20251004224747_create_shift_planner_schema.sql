/*
  # Shift Planner Database Schema

  ## Overview
  This migration creates a comprehensive shift planning system with Microsoft authentication support,
  role-based access control, regional organization, and shift management capabilities.

  ## 1. New Tables
    
    ### `profiles`
    - `id` (uuid, primary key, references auth.users)
    - `email` (text, unique, not null)
    - `full_name` (text)
    - `role` (text, default 'employee') - 'admin' or 'employee'
    - `region_id` (uuid, nullable, references regions)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    
    ### `regions`
    - `id` (uuid, primary key)
    - `name` (text, not null)
    - `description` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    
    ### `shifts`
    - `id` (uuid, primary key)
    - `employee_id` (uuid, not null, references profiles)
    - `shift_date` (date, not null)
    - `time_from` (time, not null)
    - `time_to` (time, not null)
    - `client_name` (text, not null)
    - `notes` (text, default '')
    - `created_by` (uuid, references profiles)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    
    ### `weekly_templates`
    - `id` (uuid, primary key)
    - `employee_id` (uuid, not null, references profiles)
    - `name` (text, not null)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    
    ### `template_shifts`
    - `id` (uuid, primary key)
    - `template_id` (uuid, not null, references weekly_templates)
    - `day_of_week` (integer, not null) - 0=Monday, 6=Sunday
    - `time_from` (time, not null)
    - `time_to` (time, not null)
    - `client_name` (text, not null)
    - `notes` (text, default '')
    - `created_at` (timestamptz)

  ## 2. Security
    - Enable RLS on all tables
    - Admins can manage all data
    - Employees can view their own data and create their own shifts
    - Employees can view colleagues in the same region
    - Public can't access any data without authentication

  ## 3. Indexes
    - Index on shifts by employee_id and shift_date for efficient queries
    - Index on profiles by region_id
    - Index on template_shifts by template_id

  ## 4. Important Notes
    - Microsoft authentication will be configured through Supabase Auth providers
    - The role field determines admin vs employee access
    - Templates are per-employee and can be copied to create actual shifts
    - All timestamps use timezone-aware types
*/

-- Create regions table
CREATE TABLE IF NOT EXISTS regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text DEFAULT '',
  role text DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  region_id uuid REFERENCES regions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  time_from time NOT NULL,
  time_to time NOT NULL,
  client_name text NOT NULL,
  notes text DEFAULT '',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create weekly_templates table
CREATE TABLE IF NOT EXISTS weekly_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create template_shifts table
CREATE TABLE IF NOT EXISTS template_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES weekly_templates(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  time_from time NOT NULL,
  time_to time NOT NULL,
  client_name text NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shifts_employee_date ON shifts(employee_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_profiles_region ON profiles(region_id);
CREATE INDEX IF NOT EXISTS idx_template_shifts_template ON template_shifts(template_id);

-- Enable RLS
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_shifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for regions

CREATE POLICY "Admins can view all regions"
  ON regions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert regions"
  ON regions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update regions"
  ON regions FOR UPDATE
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

CREATE POLICY "Admins can delete regions"
  ON regions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can view their region"
  ON regions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.region_id = regions.id
    )
  );

-- RLS Policies for profiles

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Employees can view colleagues in same region"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    region_id IN (
      SELECT region_id FROM profiles
      WHERE id = auth.uid()
    )
  );

-- RLS Policies for shifts

CREATE POLICY "Admins can view all shifts"
  ON shifts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert shifts"
  ON shifts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update shifts"
  ON shifts FOR UPDATE
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

CREATE POLICY "Admins can delete shifts"
  ON shifts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can view own shifts"
  ON shifts FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Employees can insert own shifts"
  ON shifts FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees can update own shifts"
  ON shifts FOR UPDATE
  TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees can delete own shifts"
  ON shifts FOR DELETE
  TO authenticated
  USING (employee_id = auth.uid());

-- RLS Policies for weekly_templates

CREATE POLICY "Admins can view all templates"
  ON weekly_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert templates"
  ON weekly_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update templates"
  ON weekly_templates FOR UPDATE
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

CREATE POLICY "Admins can delete templates"
  ON weekly_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can view own templates"
  ON weekly_templates FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Employees can insert own templates"
  ON weekly_templates FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees can update own templates"
  ON weekly_templates FOR UPDATE
  TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees can delete own templates"
  ON weekly_templates FOR DELETE
  TO authenticated
  USING (employee_id = auth.uid());

-- RLS Policies for template_shifts

CREATE POLICY "Admins can view all template shifts"
  ON template_shifts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert template shifts"
  ON template_shifts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update template shifts"
  ON template_shifts FOR UPDATE
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

CREATE POLICY "Admins can delete template shifts"
  ON template_shifts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can view own template shifts"
  ON template_shifts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_templates
      WHERE weekly_templates.id = template_shifts.template_id
      AND weekly_templates.employee_id = auth.uid()
    )
  );

CREATE POLICY "Employees can insert own template shifts"
  ON template_shifts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_templates
      WHERE weekly_templates.id = template_shifts.template_id
      AND weekly_templates.employee_id = auth.uid()
    )
  );

CREATE POLICY "Employees can update own template shifts"
  ON template_shifts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_templates
      WHERE weekly_templates.id = template_shifts.template_id
      AND weekly_templates.employee_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_templates
      WHERE weekly_templates.id = template_shifts.template_id
      AND weekly_templates.employee_id = auth.uid()
    )
  );

CREATE POLICY "Employees can delete own template shifts"
  ON template_shifts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_templates
      WHERE weekly_templates.id = template_shifts.template_id
      AND weekly_templates.employee_id = auth.uid()
    )
  );

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();