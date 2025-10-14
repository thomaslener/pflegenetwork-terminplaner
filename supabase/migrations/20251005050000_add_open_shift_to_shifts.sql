/*
  # Add open shift flag to shifts

  ## Overview
  - Introduces an `open_shift` boolean to mark appointments that are not yet assigned
    and should be visible to partners within the same federal state.
  - Defaults to `false` to keep the existing behaviour unchanged.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'shifts'
      AND column_name = 'open_shift'
  ) THEN
    ALTER TABLE shifts
      ADD COLUMN open_shift boolean DEFAULT false NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN shifts.open_shift IS 'Marks a shift as openly available for partners in the same federal state.';
