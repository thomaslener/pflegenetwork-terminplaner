/*
  # Add Federal States and Restructure Regions

  ## Overview
  This migration adds a new hierarchical structure for regions by introducing federal states (Bundesländer)
  as the top level, with regions as children of federal states.

  ## 1. New Tables
    
    ### `federal_states`
    - `id` (uuid, primary key)
    - `name` (text, not null, unique) - Name of the federal state
    - `sort_order` (integer) - For ordering the states alphabetically
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## 2. Modified Tables
    
    ### `regions`
    - Add `federal_state_id` (uuid, references federal_states)
    - Keep existing columns: id, name, description, sort_order, created_at, updated_at

  ## 3. Initial Data
    - Pre-populate federal_states with Austrian states in alphabetical order:
      Burgenland, Kärnten, Niederösterreich, Oberösterreich, Salzburg, Steiermark, Tirol, Vorarlberg, Wien

  ## 4. Data Migration
    - Assign existing regions "Innsbruck" and "Innsbruck Land" to Tirol

  ## 5. Security
    - Enable RLS on federal_states table
    - Add policies for federal_states (admins can manage, authenticated users can read)
    - Update regions policies to work with new federal_state_id

  ## 6. Important Notes
    - Federal states are predefined and should not be deleted
    - Regions can be freely added under any federal state
    - The hierarchy is: Federal State -> Region -> Profiles
*/

-- Create federal_states table
CREATE TABLE IF NOT EXISTS federal_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add federal_state_id to regions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'regions' AND column_name = 'federal_state_id'
  ) THEN
    ALTER TABLE regions ADD COLUMN federal_state_id uuid REFERENCES federal_states(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for federal_state_id in regions
CREATE INDEX IF NOT EXISTS idx_regions_federal_state ON regions(federal_state_id);

-- Enable RLS on federal_states
ALTER TABLE federal_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies for federal_states

CREATE POLICY "Authenticated users can view federal states"
  ON federal_states FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert federal states"
  ON federal_states FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update federal states"
  ON federal_states FOR UPDATE
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

CREATE POLICY "Admins can delete federal states"
  ON federal_states FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert Austrian federal states in alphabetical order
INSERT INTO federal_states (name, sort_order)
VALUES
  ('Burgenland', 1),
  ('Kärnten', 2),
  ('Niederösterreich', 3),
  ('Oberösterreich', 4),
  ('Salzburg', 5),
  ('Steiermark', 6),
  ('Tirol', 7),
  ('Vorarlberg', 8),
  ('Wien', 9)
ON CONFLICT (name) DO NOTHING;

-- Migrate existing regions to Tirol
DO $$
DECLARE
  tirol_id uuid;
BEGIN
  SELECT id INTO tirol_id FROM federal_states WHERE name = 'Tirol';
  
  IF tirol_id IS NOT NULL THEN
    UPDATE regions
    SET federal_state_id = tirol_id
    WHERE name IN ('Innsbruck', 'Innsbruck Land');
  END IF;
END $$;