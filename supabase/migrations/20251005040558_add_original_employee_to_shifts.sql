/*
  # Add original employee tracking for shift replacements

  ## Changes
  - Add original_employee_id column to shifts table
  - This tracks who originally had the shift before it was taken over
  - Enables displaying "In Vertretung für [Name]" in the UI

  ## Security
  - No RLS changes needed, uses existing policies
*/

-- Add column to track original employee when shift is taken over
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS original_employee_id uuid REFERENCES profiles(id);

-- Add comment for documentation
COMMENT ON COLUMN shifts.original_employee_id IS 'The original employee who had this shift before it was taken over as a replacement';
