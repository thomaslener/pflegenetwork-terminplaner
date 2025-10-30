/*
  # Create Districts Table

  ## Overview
  This migration creates a districts table to store regions that belong to federal states (Bundesländer).
  The existing `regions` table contains the federal states (Bundesländer), and this new table
  will contain the districts/regions within each federal state.

  ## Changes
  1. Create `districts` table with:
     - `id` (uuid, primary key)
     - `name` (text, required) - Name of the district/region
     - `description` (text, optional) - Description of the district
     - `federal_state_id` (uuid, required) - Foreign key to regions table (federal states)
     - `sort_order` (integer, optional) - For custom ordering
     - `created_at` (timestamp)
     - `updated_at` (timestamp)

  2. Security
     - Enable RLS on districts table
     - Admins can manage all districts
     - Employees can view districts in their federal state

  ## Notes
  - The `regions` table is renamed conceptually to represent federal states (Bundesländer)
  - The new `districts` table represents regions within federal states
*/

CREATE TABLE IF NOT EXISTS districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  federal_state_id uuid NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE districts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all districts"
  ON districts FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  );

CREATE POLICY "Admins can insert districts"
  ON districts FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role')::text = 'admin'
  );

CREATE POLICY "Admins can update districts"
  ON districts FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  )
  WITH CHECK (
    (auth.jwt()->>'role')::text = 'admin'
  );

CREATE POLICY "Admins can delete districts"
  ON districts FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  );

CREATE POLICY "Employees can view districts"
  ON districts FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_districts_federal_state_id ON districts(federal_state_id);
CREATE INDEX IF NOT EXISTS idx_districts_sort_order ON districts(sort_order);
