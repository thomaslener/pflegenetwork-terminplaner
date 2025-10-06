/*
  # Create Absences Table

  This migration creates the absences table for tracking employee time off.

  ## New Tables
  
  ### `absences`
  - `id` (uuid, primary key) - Unique identifier for each absence
  - `employee_id` (uuid, foreign key) - References profiles table
  - `start_date` (date) - Start date of absence
  - `start_time` (time) - Start time of absence
  - `end_date` (date) - End date of absence
  - `end_time` (time) - End time of absence
  - `reason` (text, optional) - Optional reason for absence
  - `created_at` (timestamptz) - When the record was created
  - `updated_at` (timestamptz) - When the record was last updated

  ## Security
  
  1. Enable RLS on `absences` table
  2. Security Policies:
     - Admins can perform all operations (SELECT, INSERT, UPDATE, DELETE)
     - Employees can view all absences (SELECT)
     - Employees can create their own absences (INSERT)
     - Employees can update their own absences (UPDATE)
     - Employees can delete their own absences (DELETE)

  ## Notes
  
  - The table uses separate date and time fields for flexibility
  - Absences can span multiple days
  - All timestamps are stored in UTC
  - Default values ensure data integrity
*/

-- Create absences table
CREATE TABLE IF NOT EXISTS absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  start_time time NOT NULL DEFAULT '00:00:00',
  end_date date NOT NULL,
  end_time time NOT NULL DEFAULT '23:59:59',
  reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can view all absences"
  ON absences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert absences"
  ON absences FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update absences"
  ON absences FOR UPDATE
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

CREATE POLICY "Admins can delete absences"
  ON absences FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Employee policies
CREATE POLICY "Employees can view all absences"
  ON absences FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can insert own absences"
  ON absences FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees can update own absences"
  ON absences FOR UPDATE
  TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees can delete own absences"
  ON absences FOR DELETE
  TO authenticated
  USING (employee_id = auth.uid());

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_absences_employee_id ON absences(employee_id);
CREATE INDEX IF NOT EXISTS idx_absences_dates ON absences(start_date, end_date);
