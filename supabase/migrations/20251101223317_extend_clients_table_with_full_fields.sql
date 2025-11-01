/*
  # Erweitere Klienten-Tabelle für vollständige Datenverarbeitung

  1. Änderungen an der `clients` Tabelle
    - Erweitere die Tabelle um alle Felder aus der JSON-Import-Datei
    - Felder:
      - `vorname` (text) - Vorname des Klienten
      - `nachname` (text) - Nachname des Klienten
      - `geburtsdatum` (text) - Geburtsdatum im Format YYYYMMDD
      - `geschlecht` (text) - Geschlecht (M/W)
      - `email` (text) - E-Mail-Adresse
      - `telefon` (text) - Telefonnummer
      - `strasse` (text) - Straße und Hausnummer
      - `plz` (text) - Postleitzahl
      - `ort` (text) - Ort/Stadt
      - `svnr` (text) - Sozialversicherungsnummer
      - `pflegestufe` (text) - Pflegestufe des Klienten
      - `status` (text) - Status (aktiv/inaktiv/Interessent)
      - `betreuer_firma` (text) - Zuständiger Betreuer
      - `nationalitaet` (text) - Nationalität
      - `familienstand` (text) - Familienstand
      - `erstellt_am` (bigint) - Zeitstempel der Erstellung (Format: YYYYMMDDHHMMSS)
      - `erstellt_von` (text) - Erstellt von (Benutzername)
      - `geaendert_am` (bigint) - Zeitstempel der letzten Änderung
      - `geaendert_von` (text) - Geändert von (Benutzername)
    
  2. Hinweise
    - Alle neuen Felder sind optional (nullable)
    - Bestehende `first_name` und `last_name` Felder bleiben erhalten für Abwärtskompatibilität
    - Die Datumsfelder verwenden bigint für das spezielle Zeitstempelformat
*/

-- Add new columns to clients table
DO $$ 
BEGIN
  -- Persönliche Daten
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'vorname') THEN
    ALTER TABLE clients ADD COLUMN vorname text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'nachname') THEN
    ALTER TABLE clients ADD COLUMN nachname text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'geburtsdatum') THEN
    ALTER TABLE clients ADD COLUMN geburtsdatum text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'geschlecht') THEN
    ALTER TABLE clients ADD COLUMN geschlecht text;
  END IF;
  
  -- Kontaktdaten
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'email') THEN
    ALTER TABLE clients ADD COLUMN email text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'telefon') THEN
    ALTER TABLE clients ADD COLUMN telefon text DEFAULT '';
  END IF;
  
  -- Adressdaten
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'strasse') THEN
    ALTER TABLE clients ADD COLUMN strasse text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'plz') THEN
    ALTER TABLE clients ADD COLUMN plz text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'ort') THEN
    ALTER TABLE clients ADD COLUMN ort text DEFAULT '';
  END IF;
  
  -- Pflege- und Statusdaten
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'svnr') THEN
    ALTER TABLE clients ADD COLUMN svnr text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'pflegestufe') THEN
    ALTER TABLE clients ADD COLUMN pflegestufe text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'status') THEN
    ALTER TABLE clients ADD COLUMN status text DEFAULT 'aktiv';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'betreuer_firma') THEN
    ALTER TABLE clients ADD COLUMN betreuer_firma text DEFAULT '';
  END IF;
  
  -- Weitere persönliche Daten
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'nationalitaet') THEN
    ALTER TABLE clients ADD COLUMN nationalitaet text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'familienstand') THEN
    ALTER TABLE clients ADD COLUMN familienstand text DEFAULT '';
  END IF;
  
  -- Audit-Felder (Original-Zeitstempel im Format YYYYMMDDHHMMSS)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'erstellt_am') THEN
    ALTER TABLE clients ADD COLUMN erstellt_am bigint;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'erstellt_von') THEN
    ALTER TABLE clients ADD COLUMN erstellt_von text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'geaendert_am') THEN
    ALTER TABLE clients ADD COLUMN geaendert_am bigint;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'geaendert_von') THEN
    ALTER TABLE clients ADD COLUMN geaendert_von text DEFAULT '';
  END IF;
END $$;