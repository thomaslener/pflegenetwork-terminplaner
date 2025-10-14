# Pflichtenheft: pflege network Terminplaner

## 1. Projektübersicht

### 1.1 Projekttitel
pflege network Terminplaner - Webanwendung zur Verwaltung von Pflegeterminen und Mitarbeitereinsätzen

### 1.2 Projektbeschreibung
Eine webbasierte Single Page Application (SPA) zur Verwaltung von Pflegeterminen, Mitarbeitern, Regionen und Abwesenheiten. Die Anwendung ermöglicht es Administratoren, Termine zu planen und zu verwalten, während Mitarbeiter ihre eigenen Termine einsehen, Vertretungen übernehmen und ihre Abwesenheiten verwalten können.

### 1.3 Zielgruppe
- **Administratoren**: Personalverantwortliche und Disponenten in Pflegeorganisationen
- **Mitarbeiter**: Pflegekräfte, die ihre Termine einsehen und verwalten möchten

### 1.4 Projektziele
- Zentrale Verwaltung aller Pflegetermine
- Einfache Urlaubsverwaltung
- Transparente Wochenübersicht für alle Mitarbeiter
- Flexibles Vertretungssystem mit geografischer Einschränkung
- Vorlagensystem zur Vereinfachung wiederkehrender Terminserien

---

## 2. Technologie-Stack

### 2.1 Frontend
- **Framework**: React 18.3.1 mit TypeScript 5.5.3
- **Build Tool**: Vite 5.4.2
- **Styling**: Tailwind CSS 3.4.1
- **Icons**: Lucide React 0.344.0
- **State Management**: React Context API + useState/useEffect Hooks

### 2.2 Backend / Datenbank
- **Backend-as-a-Service**: Supabase
- **Datenbank**: PostgreSQL (über Supabase)
- **Authentifizierung**: Supabase Auth (Email/Password)
- **Row Level Security**: PostgreSQL RLS Policies
- **Serverless Functions**: Supabase Edge Functions (Deno)

### 2.3 Hosting & Deployment
- Frontend: Statische Website (kann auf jedem CDN/Hosting gehostet werden)
- Backend: Vollständig über Supabase verwaltet
- Edge Functions: Supabase Edge Runtime

---

## 3. Architektur & Design-Prinzipien

### 3.1 Single Page Application (SPA)
- Die gesamte Anwendung läuft als SPA ohne Page-Reloads
- State-basierte Navigation statt URL-Routing
- Tab-Wechsel erfolgen durch Conditional Rendering
- Keine Verwendung von React Router oder ähnlichen Libraries

### 3.2 Authentifizierung & Session-Management
- Email/Password-Authentifizierung über Supabase Auth
- Session-Persistierung im Browser LocalStorage
- Automatisches Re-Login bei Page Reload
- Auth State Listener für reaktive Updates
- Globaler Auth Context für app-weiten Zugriff auf User-Daten

### 3.3 Rollenbasierte Zugriffskontrolle (RBAC)
Zwei Benutzerrollen:
1. **Admin**: Vollzugriff auf alle Funktionen
2. **Employee**: Eingeschränkter Zugriff (eigene Termine + Teamübersicht)

### 3.4 Performance-Optimierung
- Client-seitiges Filtering und Suche (kein Server-Request bei jedem Tastendruck)
- Optimistic UI Updates
- Lazy Loading von Komponenten
- Vite für ultra-schnelle Entwicklung und optimierte Production Builds

---

## 4. Datenbankschema

### 4.1 Tabellen-Übersicht

#### 4.1.1 `auth.users` (Supabase-System-Tabelle)
Verwaltet von Supabase Auth, speichert Authentifizierungsdaten.

#### 4.1.2 `profiles`
Erweiterte Benutzerprofile mit organisatorischen Informationen.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|-------------|
| id | uuid | Primary Key | REFERENCES auth.users(id) ON DELETE CASCADE |
| email | text | E-Mail-Adresse | UNIQUE, NOT NULL |
| full_name | text | Vollständiger Name | DEFAULT '' |
| role | text | Rolle (admin/employee) | CHECK (role IN ('admin', 'employee')), DEFAULT 'employee' |
| region_id | uuid | Zugewiesene Region | REFERENCES regions(id) ON DELETE SET NULL |
| sort_order | integer | Sortierreihenfolge in Listen | DEFAULT 0 |
| created_at | timestamptz | Erstellungsdatum | DEFAULT now() |
| updated_at | timestamptz | Letzte Änderung | DEFAULT now() |

**Indexes:**
- `idx_profiles_region` auf `region_id`

#### 4.1.3 `federal_states`
Bundesländer (Österreich) als oberste geografische Ebene.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|-------------|
| id | uuid | Primary Key | DEFAULT gen_random_uuid() |
| name | text | Name des Bundeslandes | UNIQUE, NOT NULL |
| sort_order | integer | Sortierreihenfolge | DEFAULT 0 |
| created_at | timestamptz | Erstellungsdatum | DEFAULT now() |
| updated_at | timestamptz | Letzte Änderung | DEFAULT now() |

**Vorbefüllte Daten:**
1. Burgenland
2. Kärnten
3. Niederösterreich
4. Oberösterreich
5. Salzburg
6. Steiermark
7. Tirol
8. Vorarlberg
9. Wien

#### 4.1.4 `regions`
Regionen innerhalb der Bundesländer.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|-------------|
| id | uuid | Primary Key | DEFAULT gen_random_uuid() |
| name | text | Name der Region | NOT NULL |
| federal_state_id | uuid | Zugehöriges Bundesland | REFERENCES federal_states(id) ON DELETE SET NULL |
| description | text | Beschreibung | DEFAULT '' |
| sort_order | integer | Sortierreihenfolge | DEFAULT 0 |
| created_at | timestamptz | Erstellungsdatum | DEFAULT now() |
| updated_at | timestamptz | Letzte Änderung | DEFAULT now() |

**Indexes:**
- `idx_regions_federal_state` auf `federal_state_id`

#### 4.1.5 `clients`
Klientendaten (Pflegebedürftige).

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|-------------|
| id | uuid | Primary Key | DEFAULT gen_random_uuid() |
| first_name | text | Vorname | NOT NULL |
| last_name | text | Nachname | NOT NULL |
| created_at | timestamptz | Erstellungsdatum | DEFAULT now() |
| updated_at | timestamptz | Letzte Änderung | DEFAULT now() |

**Indexes:**
- `idx_clients_last_name` auf `last_name`
- `idx_clients_first_name` auf `first_name`
- `idx_clients_full_name` auf `(last_name, first_name)`

#### 4.1.6 `shifts`
Termine/Schichten mit allen Details.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|-------------|
| id | uuid | Primary Key | DEFAULT gen_random_uuid() |
| employee_id | uuid | Zugewiesener Mitarbeiter | REFERENCES profiles(id) ON DELETE CASCADE, NULLABLE |
| region_id | uuid | Zugewiesene Region | REFERENCES regions(id) ON DELETE SET NULL |
| shift_date | date | Datum des Termins | NOT NULL |
| time_from | time | Startzeit | NOT NULL |
| time_to | time | Endzeit | NOT NULL |
| client_name | text | Klientenname | NOT NULL |
| notes | text | Notizen | DEFAULT '' |
| seeking_replacement | boolean | Sucht Vertretung | DEFAULT false |
| original_employee_id | uuid | Ursprünglicher Mitarbeiter | REFERENCES profiles(id) ON DELETE SET NULL |
| open_shift | boolean | Offener Termin | DEFAULT false |
| created_by | uuid | Erstellt von | REFERENCES profiles(id) ON DELETE SET NULL |
| created_at | timestamptz | Erstellungsdatum | DEFAULT now() |
| updated_at | timestamptz | Letzte Änderung | DEFAULT now() |

**Spezielle Felder:**
- `seeking_replacement`: Markiert Termine, für die eine Vertretung gesucht wird
- `original_employee_id`: Speichert den ursprünglichen Mitarbeiter bei Vertretungen
- `open_shift`: Markiert Termine als "offen" (ohne initialen Mitarbeiter), die von jedem übernommen werden können
- `region_id`: Ermöglicht offene Termine einer Region zuzuordnen

**Indexes:**
- `idx_shifts_employee_date` auf `(employee_id, shift_date)`

#### 4.1.7 `absences`
Abwesenheiten (Urlaub, Krankheit, etc.).

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|-------------|
| id | uuid | Primary Key | DEFAULT gen_random_uuid() |
| employee_id | uuid | Betroffener Mitarbeiter | REFERENCES profiles(id) ON DELETE CASCADE, NOT NULL |
| start_date | date | Startdatum | NOT NULL |
| start_time | time | Startzeit | NOT NULL, DEFAULT '00:00:00' |
| end_date | date | Enddatum | NOT NULL |
| end_time | time | Endzeit | NOT NULL, DEFAULT '23:59:59' |
| reason | text | Grund | DEFAULT '' |
| created_at | timestamptz | Erstellungsdatum | DEFAULT now() |
| updated_at | timestamptz | Letzte Änderung | DEFAULT now() |

**Indexes:**
- `idx_absences_employee_id` auf `employee_id`
- `idx_absences_dates` auf `(start_date, end_date)`

#### 4.1.8 `weekly_templates`
Vorlagen für wiederkehrende Wochenpläne.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|-------------|
| id | uuid | Primary Key | DEFAULT gen_random_uuid() |
| employee_id | uuid | Mitarbeiter | REFERENCES profiles(id) ON DELETE CASCADE, NOT NULL |
| name | text | Vorlagenname | NOT NULL |
| created_at | timestamptz | Erstellungsdatum | DEFAULT now() |
| updated_at | timestamptz | Letzte Änderung | DEFAULT now() |

#### 4.1.9 `template_shifts`
Einzelne Termine innerhalb einer Wochenvorlage.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|-------------|
| id | uuid | Primary Key | DEFAULT gen_random_uuid() |
| template_id | uuid | Zugehörige Vorlage | REFERENCES weekly_templates(id) ON DELETE CASCADE, NOT NULL |
| day_of_week | integer | Wochentag | CHECK (day_of_week >= 0 AND day_of_week <= 6), NOT NULL |
| time_from | time | Startzeit | NOT NULL |
| time_to | time | Endzeit | NOT NULL |
| client_name | text | Klientenname | NOT NULL |
| notes | text | Notizen | DEFAULT '' |
| created_at | timestamptz | Erstellungsdatum | DEFAULT now() |

**Hinweis:** `day_of_week`: 0 = Montag, 6 = Sonntag

**Indexes:**
- `idx_template_shifts_template` auf `template_id`

### 4.2 Row Level Security (RLS) Policies

#### 4.2.1 Allgemeine Prinzipien
- Alle Tabellen haben RLS aktiviert
- Admins haben Vollzugriff auf alle Daten
- Employees haben eingeschränkten Zugriff gemäß ihrer Rolle
- Unauthentifizierte Benutzer haben keinen Zugriff

#### 4.2.2 RLS Policies nach Tabelle

**profiles:**
- Admins: SELECT, INSERT, UPDATE, DELETE auf alle Profile
- Employees: SELECT auf eigenes Profil + Kollegen in gleicher Region
- Employees: UPDATE auf eigenes Profil (ohne Rollenänderung)

**federal_states:**
- Alle authentifizierten Benutzer: SELECT
- Admins: INSERT, UPDATE, DELETE

**regions:**
- Admins: SELECT, INSERT, UPDATE, DELETE auf alle Regionen
- Employees: SELECT auf eigene Region

**clients:**
- Admins: SELECT, INSERT, UPDATE, DELETE auf alle Klienten
- Employees: SELECT auf alle Klienten (benötigt für Terminzuweisung)

**shifts:**
- Admins: SELECT, INSERT, UPDATE, DELETE auf alle Termine
- Employees: SELECT auf alle Termine (Wochenübersicht)
- Employees: INSERT, UPDATE, DELETE auf eigene Termine
- Employees: UPDATE auf Termine mit `seeking_replacement=true` im gleichen Bundesland (für Vertretungsübernahme)
- Employees: UPDATE auf Termine mit `open_shift=true` im gleichen Bundesland (für Übernahme offener Termine)

**absences:**
- Admins: SELECT, INSERT, UPDATE, DELETE auf alle Abwesenheiten
- Employees: SELECT auf alle Abwesenheiten (Teamübersicht)
- Employees: INSERT, UPDATE, DELETE auf eigene Abwesenheiten

**weekly_templates:**
- Admins: SELECT, INSERT, UPDATE, DELETE auf alle Vorlagen
- Employees: SELECT, INSERT, UPDATE, DELETE auf eigene Vorlagen

**template_shifts:**
- Admins: SELECT, INSERT, UPDATE, DELETE auf alle Template-Termine
- Employees: SELECT, INSERT, UPDATE, DELETE auf Termine in eigenen Vorlagen

### 4.3 Datenbank-Trigger

#### 4.3.1 Auto-Profile-Erstellung
```sql
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

Dieser Trigger erstellt automatisch ein Profil in der `profiles`-Tabelle, wenn ein neuer Benutzer registriert wird.

---

## 5. Edge Functions (Serverless)

### 5.1 create-user
**Pfad:** `/functions/v1/create-user`
**Methode:** POST
**Authentifizierung:** Erforderlich (JWT Token)

**Zweck:** Erstellt neue Benutzer mit Admin-Berechtigung (umgeht die deaktivierte öffentliche Registrierung).

**Request Body:**
```typescript
{
  email: string;
  full_name: string;
  role: 'admin' | 'employee';
  region_id: string | null;
  sort_order: number;
}
```

**Response:**
```typescript
{
  success: boolean;
  user?: User;
  temporaryPassword?: string;
  error?: string;
}
```

**Logik:**
1. Verifiziert, dass der anfragende Benutzer Admin ist
2. Generiert temporäres Passwort
3. Erstellt Benutzer mit `admin.createUser()` (Supabase Admin API)
4. Setzt `email_confirm: true`
5. Aktualisiert Profil mit zusätzlichen Daten
6. Gibt temporäres Passwort zurück

### 5.2 update-user-password
**Pfad:** `/functions/v1/update-user-password`
**Methode:** POST
**Authentifizierung:** Erforderlich (JWT Token)

**Zweck:** Admins können Passwörter von Benutzern zurücksetzen.

**Request Body:**
```typescript
{
  user_id: string;
  new_password: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

**Logik:**
1. Verifiziert, dass der anfragende Benutzer Admin ist
2. Aktualisiert Passwort mit `admin.updateUserById()`
3. Gibt Erfolgsmeldung zurück

---

## 6. Frontend-Komponenten-Struktur

### 6.1 Authentifizierung & Routing

#### 6.1.1 `src/main.tsx`
Entry Point der Anwendung.
- Initialisiert React Root
- Wrapped App mit `AuthProvider`
- Importiert globale Styles

#### 6.1.2 `src/App.tsx`
Hauptkomponente mit Routing-Logik.
- Zeigt `LoginPage` wenn nicht authentifiziert
- Zeigt `AdminDashboard` für Admins
- Zeigt `EmployeeDashboard` für Employees
- Zeigt Loading-State während Auth-Check

#### 6.1.3 `src/contexts/AuthContext.tsx`
Globaler Auth Context.

**Bereitgestellte Werte:**
```typescript
{
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}
```

**Funktionalität:**
- Lädt Session aus LocalStorage
- Setzt Auth State Listener
- Lädt Profildaten nach Login
- Stellt `signOut()` Funktion bereit

#### 6.1.4 `src/components/LoginPage.tsx`
Login/Registrierungs-Formular.

**Features:**
- Toggle zwischen Login und Registrierung
- Email/Password Eingabefelder
- Validierung (min. 6 Zeichen Passwort)
- Error-Handling mit Fehlermeldungs-Anzeige
- Loading State während Authentifizierung
- Automatische Weiterleitung nach erfolgreichem Login

### 6.2 Admin-Bereich

#### 6.2.1 `src/components/admin/AdminDashboard.tsx`
Haupt-Dashboard für Administratoren.

**Tab-Navigation:**
1. Wochenübersicht
2. Termine
3. Abwesenheiten
4. Klienten
5. Personen
6. Regionen

**Features:**
- Tab-basierte Navigation
- Aktiver Tab hervorgehoben
- Logo und Benutzername in Header
- Logout-Button

#### 6.2.2 `src/components/admin/WeeklyOverview.tsx`
Tabellarische Wochenübersicht aller Mitarbeiter.

**Funktionalität:**
- Wochenauswahl (vorherige/nächste Woche)
- Anzeige KW-Nummer
- Gruppierung nach Bundesland -> Region
- Farbcodierung pro Mitarbeiter
- Anzeige aller Termine in Grid-Layout
- Offene Termine in separater Zeile (gelb/amber)
- Inline-Anzeige von Abwesenheiten
- Quick-Actions:
  - Termin hinzufügen
  - Offenen Termin hinzufügen
- Visuelle Markierung des heutigen Tags

**Layout:**
- Sticky Header
- Sticky erste Spalte (Mitarbeitername)
- Horizontales Scrolling bei Bedarf
- Responsive Spaltenbreiten

#### 6.2.3 `src/components/admin/AdminShiftManagement.tsx`
CRUD-Verwaltung für Termine.

**Features:**
- Liste aller Termine mit Filter/Suche
- "Termin hinzufügen" Button
- "Offenen Termin hinzufügen" Button
- Modal/Formular für Termin-Erstellung/Bearbeitung
- Felder:
  - Mitarbeiter-Auswahl (Dropdown oder null für offenen Termin)
  - Region-Auswahl (für offene Termine)
  - Datum (Date Picker)
  - Startzeit / Endzeit (Time Picker)
  - Klientenname (Autocomplete)
  - Notizen (Textarea)
  - "Sucht Vertretung" Checkbox
  - "Offener Termin" Checkbox
- Edit/Delete Aktionen
- Bestätigungsdialog vor Löschen

#### 6.2.4 `src/components/admin/AbsenceManagement.tsx`
Verwaltung von Abwesenheiten.

**Features:**
- Liste aller Abwesenheiten
- Filter nach Mitarbeiter
- "Abwesenheit hinzufügen" Button
- Formular mit Feldern:
  - Mitarbeiter-Auswahl
  - Startdatum / Startzeit
  - Enddatum / Endzeit
  - Grund (optional)
- Edit/Delete Aktionen
- Visuelle Darstellung der Zeitspanne

#### 6.2.5 `src/components/admin/ClientManagement.tsx`
Verwaltung von Klienten.

**Features:**
- Liste aller Klienten
- Suchfunktion (client-seitig)
- "Klient hinzufügen" Button
- Formular mit Feldern:
  - Vorname
  - Nachname
- Edit/Delete Aktionen
- Alphabetische Sortierung

#### 6.2.6 `src/components/admin/EmployeeManagement.tsx`
Verwaltung von Mitarbeitern/Personen.

**Features:**
- Liste aller Mitarbeiter gruppiert nach Region
- "Person hinzufügen" Button
- Formular mit Feldern:
  - E-Mail
  - Vollständiger Name
  - Rolle (Admin/Employee)
  - Region
- Edit Funktion (nur Name, Rolle, Region - nicht E-Mail)
- Delete Funktion
- Drag & Drop Sortierung innerhalb Regionen
- Anzeige temporäres Passwort nach Erstellung
- Nutzung der `create-user` Edge Function

#### 6.2.7 `src/components/admin/RegionManagement.tsx`
Verwaltung von Regionen.

**Features:**
- Liste aller Regionen gruppiert nach Bundesland
- "Region hinzufügen" Button
- Formular mit Feldern:
  - Name
  - Bundesland (Dropdown)
  - Beschreibung
- Edit/Delete Aktionen
- Drag & Drop Sortierung innerhalb Bundesländer
- Automatische Gruppierung

### 6.3 Employee-Bereich

#### 6.3.1 `src/components/employee/EmployeeDashboard.tsx`
Haupt-Dashboard für Mitarbeiter.

**Tab-Navigation:**
1. Dashboard (Meine Termine)
2. Wochenübersicht
3. Wochen-Vorlagen
4. Meine Abwesenheiten

**Features:**
- Reduzierte Navigation (keine Admin-Funktionen)
- Logo und Benutzername in Header
- Logout-Button

#### 6.3.2 `src/components/employee/MyShifts.tsx`
Übersicht der eigenen Termine.

**Features:**
- Liste eigener Termine (chronologisch)
- Filterung nach Zeitraum
- Anzeige von:
  - Datum
  - Uhrzeit
  - Klientenname
  - Notizen
- Button "Vertretung suchen" (setzt `seeking_replacement=true`)
- Visuelle Markierung wenn Vertretung gesucht wird

#### 6.3.3 `src/components/employee/WeeklyOverviewReadOnly.tsx`
Read-Only Wochenübersicht für Mitarbeiter.

**Funktionalität:**
- Identisch zu Admin-Wochenübersicht im Layout
- Zusätzliche Features:
  - Button "Vertretung übernehmen?" bei Terminen mit `seeking_replacement=true`
  - Button "Termin übernehmen" bei offenen Terminen
  - Nur für Termine im gleichen Bundesland
- Keine Bearbeitungsmöglichkeiten
- Kein Hinzufügen neuer Termine

**Vertretungslogik:**
- Mitarbeiter sieht nur Vertretungsanfragen im eigenen Bundesland
- Klick auf "Vertretung übernehmen?":
  - `employee_id` wird auf übernehmer gesetzt
  - `original_employee_id` behält ursprünglichen Mitarbeiter
  - `seeking_replacement` wird auf `false` gesetzt
- Klick auf "Termin übernehmen" (offene Termine):
  - `employee_id` wird auf übernehmer gesetzt
  - `open_shift` bleibt `true` (historischer Hinweis)
  - Termin verschwindet aus offenen Terminen

#### 6.3.4 `src/components/employee/WeeklyTemplates.tsx`
Verwaltung eigener Wochenvorlagen.

**Features:**
- Liste aller eigenen Vorlagen
- "Vorlage erstellen" Button
- Formular für neue Vorlage:
  - Vorlagenname
  - Termine für jeden Wochentag (0-6)
    - Startzeit
    - Endzeit
    - Klientenname
    - Notizen
- "Vorlage anwenden" Funktion:
  - Auswahl Startdatum
  - Erstellt reale Termine für die Woche basierend auf Vorlage
- Edit/Delete Vorlagen

#### 6.3.5 `src/components/employee/MyAbsences.tsx`
Verwaltung eigener Abwesenheiten.

**Features:**
- Liste eigener Abwesenheiten
- "Abwesenheit hinzufügen" Button
- Formular mit Feldern:
  - Startdatum / Startzeit
  - Enddatum / Endzeit
  - Grund (optional)
- Edit/Delete eigener Abwesenheiten
- Visuelle Timeline-Darstellung

### 6.4 Shared Components

#### 6.4.1 `src/components/shared/ClientAutocomplete.tsx`
Wiederverwendbare Autocomplete-Komponente für Klientensuche.

**Features:**
- Live-Suche bei jedem Tastendruck
- Suche nach Vorname, Nachname oder beides
- Funktioniert in beide Richtungen ("Max Mustermann" oder "Mustermann Max")
- Dropdown mit bis zu 10 Ergebnissen
- Click-Outside-Detection zum Schließen
- Clear-Button zum Zurücksetzen
- Keyboard-Navigation

**Props:**
```typescript
{
  value: string;
  onChange: (value: string) => void;
  clients: Client[];
  onSelect: (client: Client) => void;
  placeholder?: string;
}
```

**Implementierung:**
- Client-seitiges Filtering (keine Server-Requests)
- useEffect für reaktive Filterung
- useRef für Click-Outside-Detection
- Optimiert für Performance

#### 6.4.2 `src/components/shifts/ShiftForm.tsx`
Formular für Termin-Erstellung und -Bearbeitung.

**Props:**
```typescript
{
  shift?: Shift | null;
  onSubmit: (data: ShiftFormData) => Promise<void>;
  onCancel: () => void;
  employees: Profile[];
  clients: Client[];
}
```

**Features:**
- Verwendung von ClientAutocomplete
- Validierung aller Felder
- Loading State während Submit
- Error Handling

#### 6.4.3 `src/components/shifts/ShiftList.tsx`
Liste von Terminen mit Filter- und Sortierfunktionen.

**Features:**
- Darstellung als Karten oder Tabelle
- Farbcodierung nach Status:
  - Standard: Weiß
  - Sucht Vertretung: Gelb
  - Offener Termin: Blau
- Quick-Actions (Edit/Delete)
- Responsive Layout

---

## 7. Benutzerrollen & Berechtigungen

### 7.1 Administrator

#### 7.1.1 Berechtigungen
- Vollzugriff auf alle Daten
- Verwaltung von Mitarbeitern, Regionen, Klienten
- Erstellen, Bearbeiten, Löschen von Terminen aller Mitarbeiter
- Erstellen, Bearbeiten, Löschen von Abwesenheiten aller Mitarbeiter
- Einsicht in alle Wochenübersichten
- Erstellung neuer Benutzerkonten mit temporären Passwörtern

#### 7.1.2 Dashboard-Tabs
1. **Wochenübersicht**: Gesamtübersicht aller Termine gruppiert nach Region
2. **Termine**: CRUD-Verwaltung aller Termine
3. **Abwesenheiten**: CRUD-Verwaltung aller Abwesenheiten
4. **Klienten**: CRUD-Verwaltung aller Klienten
5. **Personen**: CRUD-Verwaltung aller Mitarbeiter
6. **Regionen**: CRUD-Verwaltung aller Regionen

### 7.2 Employee (Mitarbeiter)

#### 7.2.1 Berechtigungen
- Einsicht in eigene Termine
- Einsicht in Team-Wochenübersicht (alle Mitarbeiter im Bundesland)
- Erstellen, Bearbeiten, Löschen eigener Abwesenheiten
- Markieren eigener Termine als "Sucht Vertretung"
- Übernehmen von Vertretungen im eigenen Bundesland
- Übernehmen von offenen Terminen im eigenen Bundesland
- Erstellen und Verwalten eigener Wochenvorlagen

#### 7.2.2 Dashboard-Tabs
1. **Dashboard**: Eigene Termine mit Quick-Actions
2. **Wochenübersicht**: Read-Only Team-Übersicht mit Vertretungsfunktion
3. **Wochen-Vorlagen**: Verwaltung wiederkehrender Terminserien
4. **Meine Abwesenheiten**: CRUD eigener Abwesenheiten

---

## 8. Funktionale Anforderungen

### 8.1 Authentifizierung

#### 8.1.1 Login
- Email und Passwort Eingabe
- Validierung (min. 6 Zeichen Passwort)
- Error-Handling bei falschen Credentials
- Session-Persistierung im Browser
- Automatische Weiterleitung basierend auf Rolle

#### 8.1.2 Logout
- Logout-Button in Header
- Session löschen
- Weiterleitung zu Login-Seite

#### 8.1.3 Session-Management
- Automatisches Re-Login bei Page Reload
- Session-Timeout nach Supabase-Standard (1 Woche)
- Token-Refresh automatisch durch Supabase

### 8.2 Admin-Funktionen

#### 8.2.1 Mitarbeiterverwaltung
- **Erstellen**: Email, Name, Rolle, Region → generiert temporäres Passwort
- **Bearbeiten**: Name, Rolle, Region (nicht Email)
- **Löschen**: Mit Bestätigungsdialog
- **Sortieren**: Drag & Drop innerhalb Regionen
- **Anzeige**: Gruppiert nach Region, alphabetisch sortiert

#### 8.2.2 Regionenverwaltung
- **Erstellen**: Name, Bundesland, Beschreibung
- **Bearbeiten**: Alle Felder
- **Löschen**: Nur wenn keine Mitarbeiter zugeordnet
- **Sortieren**: Drag & Drop innerhalb Bundesländer
- **Anzeige**: Gruppiert nach Bundesland

#### 8.2.3 Klientenverwaltung
- **Erstellen**: Vorname, Nachname
- **Bearbeiten**: Alle Felder
- **Löschen**: Mit Bestätigungsdialog
- **Suchen**: Client-seitige Volltextsuche
- **Anzeige**: Alphabetisch nach Nachname

#### 8.2.4 Terminverwaltung
- **Erstellen Standard-Termin**: Mitarbeiter, Datum, Zeit, Klient, Notizen
- **Erstellen Offener Termin**: Region, Datum, Zeit, Klient, Notizen (kein Mitarbeiter)
- **Bearbeiten**: Alle Felder
- **Löschen**: Mit Bestätigungsdialog
- **Markieren**: "Sucht Vertretung" togglen
- **Anzeige**: Liste oder Wochenübersicht

#### 8.2.5 Abwesenheitsverwaltung
- **Erstellen**: Mitarbeiter, Start/Ende (Datum + Zeit), Grund
- **Bearbeiten**: Alle Felder
- **Löschen**: Mit Bestätigungsdialog
- **Anzeige**: Chronologisch, mit Filter nach Mitarbeiter

#### 8.2.6 Wochenübersicht
- **Navigation**: Vorherige/Nächste Woche
- **Anzeige**: Grid-Layout mit Tagen als Spalten, Mitarbeiter als Zeilen
- **Gruppierung**: Nach Bundesland -> Region
- **Farbcodierung**: Jeder Mitarbeiter hat eigene Farbe
- **Offene Termine**: Separate Zeile pro Region in amber/gelb
- **Abwesenheiten**: Inline-Anzeige im Grid
- **Quick-Actions**: Termin hinzufügen, Offenen Termin hinzufügen

### 8.3 Employee-Funktionen

#### 8.3.1 Eigene Termine
- **Anzeigen**: Chronologische Liste eigener Termine
- **Markieren**: "Sucht Vertretung" für einzelne Termine
- **Erstellen**: Über Wochen-Vorlagen
- **Löschen**: Eigene Termine (vor Durchführung)

#### 8.3.2 Vertretungen
- **Anzeigen**: Wochenübersicht mit Terminen die Vertretung suchen (gelb)
- **Filter**: Nur Termine im eigenen Bundesland
- **Übernehmen**: Klick auf "Vertretung übernehmen?" Button
- **Effekt**: Termin wird zum eigenen Termin, Original-Mitarbeiter bleibt gespeichert

#### 8.3.3 Offene Termine
- **Anzeigen**: In Wochenübersicht in amber/gelb separater Zeile
- **Filter**: Nur Termine im eigenen Bundesland
- **Übernehmen**: Klick auf "Termin übernehmen" Button
- **Effekt**: Termin wird zum eigenen Termin, verschwindet aus offenen Terminen

#### 8.3.4 Wochenvorlagen
- **Erstellen**: Name + Termine für jeden Wochentag
- **Bearbeiten**: Name und Termine
- **Löschen**: Vorlage löschen
- **Anwenden**: Startdatum wählen → erstellt reale Termine für die Woche

#### 8.3.5 Eigene Abwesenheiten
- **Erstellen**: Start/Ende (Datum + Zeit), Grund
- **Bearbeiten**: Alle Felder
- **Löschen**: Eigene Abwesenheiten
- **Anzeige**: Chronologisch

#### 8.3.6 Wochenübersicht (Read-Only)
- **Anzeigen**: Team-Übersicht wie Admin, aber Read-Only
- **Interaktion**: Nur Vertretungsübernahme und offene Termine
- **Filter**: Bundesland automatisch auf eigenes Bundesland

### 8.4 Gemeinsame Funktionen

#### 8.4.1 Klienten-Autocomplete
- **Suche**: Live-Suche während Eingabe
- **Filter**: Nach Vorname, Nachname, oder Kombination
- **Anzeige**: Dropdown mit max. 10 Ergebnissen
- **Auswahl**: Klick oder Enter-Taste
- **Clear**: Button zum Zurücksetzen

#### 8.4.2 Wochennavigation
- **Buttons**: "Vorherige Woche" / "Nächste Woche"
- **Anzeige**: KW-Nummer und Datumsbereich
- **Heute-Markierung**: Aktueller Tag hervorgehoben

#### 8.4.3 Farbcodierung
- **Mitarbeiter**: Jeder Mitarbeiter hat eigene Farbe (aus vordefinierten Palette)
- **Status-Termine**:
  - Standard: Hintergrund hell
  - Sucht Vertretung: Gelb
  - Offener Termin: Blau/Amber
- **Konsistenz**: Farben bleiben über Sessions erhalten (durch sort_order)

---

## 9. Nicht-Funktionale Anforderungen

### 9.1 Performance

#### 9.1.1 Ladezeiten
- Initiales Laden < 3 Sekunden
- Tab-Wechsel instant (< 100ms)
- Suche/Filter instant (< 50ms, client-seitig)

#### 9.1.2 Responsiveness
- Kein Page Reload nach initialem Laden
- Alle Interaktionen < 200ms Feedback
- Smooth Animationen (60 FPS)

#### 9.1.3 Caching
- Session im LocalStorage
- Client-seitiges Caching von Listen
- Nur Delta-Updates über API

### 9.2 Sicherheit

#### 9.2.1 Authentifizierung
- Sichere Passwort-Hashing (Supabase Standard)
- Session-Tokens mit Expiration
- HTTPS-Only in Production

#### 9.2.2 Autorisierung
- Row Level Security auf Datenbankebene
- Validierung aller Berechtigungen serverseitig
- Kein Vertrauen in client-seitige Checks

#### 9.2.3 Datenintegrität
- Validierung aller Eingaben
- Foreign Key Constraints
- Transaction-Safety bei kritischen Operationen

### 9.3 Benutzerfreundlichkeit

#### 9.3.1 UI/UX
- Intuitive Navigation
- Konsistentes Design (Tailwind CSS)
- Visuelles Feedback bei allen Aktionen
- Error Messages verständlich formuliert

#### 9.3.2 Accessibility
- Keyboard-Navigation
- Focus-Indicators
- Screen-Reader-Support (ARIA-Labels)
- Kontrastreiche Farben

#### 9.3.3 Mobile Responsiveness
- Responsive Layout (Tailwind Breakpoints)
- Touch-friendly Buttons (min. 44x44px)
- Horizontales Scrolling bei Tabellen

### 9.4 Wartbarkeit

#### 9.4.1 Code-Qualität
- TypeScript für Type-Safety
- ESLint für Code-Standards
- Modulare Komponenten-Struktur
- Kommentare bei komplexer Logik

#### 9.4.2 Testing
- Unit Tests für Business-Logic (optional, aber empfohlen)
- Integration Tests für kritische Flows
- E2E Tests für Happy-Path

#### 9.4.3 Dokumentation
- Inline-Code-Kommentare
- README mit Setup-Anleitung
- API-Dokumentation für Edge Functions

---

## 10. User Stories

### 10.1 Administrator

**US-A1: Als Administrator möchte ich neue Mitarbeiter anlegen können**
- Acceptance Criteria:
  - Formular mit Email, Name, Rolle, Region
  - System generiert temporäres Passwort
  - Passwort wird angezeigt und kann kopiert werden
  - Neuer Mitarbeiter erhält Email-Bestätigung (optional)

**US-A2: Als Administrator möchte ich die Wochenübersicht aller Mitarbeiter sehen**
- Acceptance Criteria:
  - Übersicht als Grid (Tage x Mitarbeiter)
  - Gruppierung nach Bundesland und Region
  - Farbcodierung pro Mitarbeiter
  - Navigation zwischen Wochen
  - Anzeige von Terminen, offenen Terminen und Abwesenheiten

**US-A3: Als Administrator möchte ich offene Termine erstellen**
- Acceptance Criteria:
  - Formular ohne Mitarbeiter-Auswahl
  - Region-Auswahl stattdessen
  - Datum, Zeit, Klient, Notizen
  - Termin erscheint in Wochenübersicht als "Offener Termin"

**US-A4: Als Administrator möchte ich Regionen verwalten**
- Acceptance Criteria:
  - Liste aller Regionen gruppiert nach Bundesland
  - Erstellen, Bearbeiten, Löschen
  - Drag & Drop Sortierung
  - Beschreibungsfeld optional

**US-A5: Als Administrator möchte ich Klienten verwalten**
- Acceptance Criteria:
  - Liste mit Vor- und Nachname
  - Suchfunktion
  - Alphabetische Sortierung
  - Erstellen, Bearbeiten, Löschen

### 10.2 Employee (Mitarbeiter)

**US-E1: Als Mitarbeiter möchte ich meine eigenen Termine sehen**
- Acceptance Criteria:
  - Chronologische Liste
  - Datum, Zeit, Klient, Notizen
  - Filterung nach Zeitraum
  - Visuelle Unterscheidung vergangener/zukünftiger Termine

**US-E2: Als Mitarbeiter möchte ich eine Vertretung für meinen Termin suchen**
- Acceptance Criteria:
  - Button "Vertretung suchen" bei jedem Termin
  - Termin wird gelb markiert
  - Termin erscheint bei allen Mitarbeitern im Bundesland
  - Andere Mitarbeiter können übernehmen

**US-E3: Als Mitarbeiter möchte ich Vertretungen übernehmen**
- Acceptance Criteria:
  - Wochenübersicht zeigt Termine mit "Sucht Vertretung"
  - Nur Termine im eigenen Bundesland
  - Button "Vertretung übernehmen?"
  - Nach Übernahme wird Termin zum eigenen Termin

**US-E4: Als Mitarbeiter möchte ich offene Termine übernehmen**
- Acceptance Criteria:
  - Offene Termine in Wochenübersicht sichtbar
  - Nur im eigenen Bundesland
  - Button "Termin übernehmen"
  - Nach Übernahme wird Termin zum eigenen Termin

**US-E5: Als Mitarbeiter möchte ich Wochenvorlagen erstellen**
- Acceptance Criteria:
  - Formular mit Vorlagename
  - Termine für jeden Wochentag (0-6)
  - Speichern als Vorlage
  - Anwenden auf beliebige Startwochen

**US-E6: Als Mitarbeiter möchte ich meine Abwesenheiten verwalten**
- Acceptance Criteria:
  - Formular mit Start/Ende, Grund
  - Chronologische Liste
  - Bearbeiten und Löschen möglich
  - Abwesenheiten erscheinen in Wochenübersicht

---

## 11. Design-Spezifikationen

### 11.1 Farbschema

**Primärfarben:**
- Primary: Individuell (aktuell Grün-Töne in Tailwind)
- Slate für neutrale Elemente
- Weiß für Hintergründe

**Semantische Farben:**
- Erfolg: Grün (`green-600`, `green-700`)
- Warnung: Gelb/Amber (`yellow-600`, `amber-600`)
- Fehler: Rot (`red-600`, `red-700`)
- Info: Blau (`blue-600`, `blue-700`)

**Mitarbeiter-Farbpalette** (für Wochenübersicht):
```typescript
[
  'bg-blue-50 border-blue-200',
  'bg-green-50 border-green-200',
  'bg-purple-50 border-purple-200',
  'bg-orange-50 border-orange-200',
  'bg-pink-50 border-pink-200',
  'bg-cyan-50 border-cyan-200',
  'bg-amber-50 border-amber-200',
  'bg-teal-50 border-teal-200',
]
```

### 11.2 Typografie

**Schriftart:** System-Schriftarten (Tailwind Standard)
- Sans-Serif für UI
- Monospace für Code/Logs (falls benötigt)

**Schriftgrößen:**
- Überschriften: `text-xl`, `text-2xl`, `text-3xl`
- Body: `text-sm`, `text-base`
- Small: `text-xs`

**Schriftgewichte:**
- Normal: `font-normal`
- Medium: `font-medium`
- Semibold: `font-semibold`
- Bold: `font-bold`

### 11.3 Spacing

**Tailwind Spacing-Scale:**
- Extra Klein: `gap-1`, `p-1` (4px)
- Klein: `gap-2`, `p-2` (8px)
- Normal: `gap-4`, `p-4` (16px)
- Groß: `gap-6`, `p-6` (24px)
- Extra Groß: `gap-8`, `p-8` (32px)

**Komponenten-Abstände:**
- Zwischen Sections: `py-6`
- Zwischen Cards: `space-y-4`
- Inner Padding: `p-4` bis `p-6`

### 11.4 Komponenten-Styles

#### 11.4.1 Buttons
```tsx
// Primary Button
className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"

// Secondary Button
className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium py-2 px-4 rounded-lg transition-colors"

// Danger Button
className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"

// Icon Button
className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
```

#### 11.4.2 Input Fields
```tsx
className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
```

#### 11.4.3 Cards
```tsx
className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
```

#### 11.4.4 Tabs
```tsx
// Active Tab
className="flex items-center gap-2 px-6 py-4 font-medium border-b-2 border-primary-600 text-primary-600"

// Inactive Tab
className="flex items-center gap-2 px-6 py-4 font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:bg-slate-50 transition-colors"
```

### 11.5 Icons

**Icon-Library:** Lucide React
**Icon-Größe:** `w-5 h-5` (Standard), `w-4 h-4` (Klein), `w-6 h-6` (Groß)

**Verwendete Icons:**
- `Calendar`: Termine
- `Users`: Mitarbeiter/Team
- `MapPin`: Regionen
- `Clock`: Zeit/Vorlagen
- `LogOut`: Logout
- `Plus`: Hinzufügen
- `Pencil`: Bearbeiten
- `Trash2`: Löschen
- `X`: Schließen/Clear
- `Search`: Suche
- `ChevronLeft`/`ChevronRight`: Navigation
- `GripVertical`: Drag-Handle
- `Plane`: Abwesenheit
- `CircleUser`: Klient

---

## 12. API-Spezifikation

### 12.1 Supabase Client-API

Die Anwendung nutzt die Supabase JavaScript Client Library für alle Datenbankoperationen.

**Client-Initialisierung:**
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

### 12.2 Standard CRUD-Operationen

**Read:**
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value);
```

**Insert:**
```typescript
const { data, error } = await supabase
  .from('table_name')
  .insert({ field: value });
```

**Update:**
```typescript
const { data, error } = await supabase
  .from('table_name')
  .update({ field: newValue })
  .eq('id', recordId);
```

**Delete:**
```typescript
const { data, error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', recordId);
```

### 12.3 Komplexe Queries

**Joins:**
```typescript
const { data, error } = await supabase
  .from('shifts')
  .select(`
    *,
    profiles:employee_id (full_name, email)
  `)
  .eq('shift_date', date);
```

**Filtering:**
```typescript
const { data, error } = await supabase
  .from('shifts')
  .select('*')
  .gte('shift_date', startDate)
  .lte('shift_date', endDate)
  .order('shift_date', { ascending: true });
```

**Single vs maybeSingle:**
```typescript
// WICHTIG: Verwende maybeSingle() statt single() wenn null erlaubt ist
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .maybeSingle();
```

### 12.4 Auth-API

**Sign In:**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password,
});
```

**Sign Out:**
```typescript
const { error } = await supabase.auth.signOut();
```

**Get Session:**
```typescript
const { data: { session }, error } = await supabase.auth.getSession();
```

**Auth State Listener:**
```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    // Handle auth state changes
  }
);
```

### 12.5 Edge Functions API

**Call Edge Function:**
```typescript
const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/function-name`;

const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
});

const result = await response.json();
```

---

## 13. Entwicklungs-Setup

### 13.1 Voraussetzungen

**Software:**
- Node.js >= 18.x
- npm >= 9.x
- Git
- Moderner Browser (Chrome, Firefox, Safari, Edge)

**Accounts:**
- Supabase Account (kostenlos)
- Supabase Projekt erstellt

### 13.2 Installation

```bash
# Repository klonen
git clone <repository-url>
cd <project-folder>

# Dependencies installieren
npm install

# .env Datei erstellen
cp .env.example .env

# Supabase Credentials eintragen
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 13.3 Development

```bash
# Dev Server starten
npm run dev

# TypeScript Type-Check
npm run typecheck

# Linting
npm run lint

# Production Build
npm run build

# Preview Production Build
npm run preview
```

### 13.4 Supabase Setup

**Datenbank-Migrationen:**
1. Supabase Dashboard öffnen
2. SQL Editor öffnen
3. Migrations in chronologischer Reihenfolge ausführen:
   - `20251004224747_create_shift_planner_schema.sql`
   - `20251004230622_fix_rls_infinite_recursion.sql`
   - `20251005001705_allow_employees_read_all_shifts.sql`
   - `20251005022752_create_absences_table.sql`
   - `20251005023554_create_clients_table.sql`
   - `20251005030931_add_sort_order_to_regions.sql`
   - `20251005031340_add_sort_order_to_profiles.sql`
   - `20251005033901_add_seeking_replacement_to_shifts.sql`
   - `20251005040352_allow_employees_takeover_replacement_shifts.sql`
   - `20251005040558_add_original_employee_to_shifts.sql`
   - `20251005041752_add_federal_states_and_restructure_regions.sql`
   - `20251005050000_add_open_shift_to_shifts.sql`
   - `20251014182619_add_open_shift_to_shifts.sql`
   - `20251014183118_add_region_to_shifts_and_make_employee_nullable.sql`
   - `20251014184334_allow_employees_take_over_open_shifts.sql`

**Edge Functions deployen:**
- Über Supabase MCP Tools oder manuell über Supabase CLI
- Functions: `create-user`, `update-user-password`

**Auth konfigurieren:**
1. Authentication -> Settings
2. Email Auth aktivieren
3. "Confirm email" deaktivieren (optional)
4. Site URL setzen

### 13.5 Type-Generierung

```bash
# Supabase Types generieren (optional, manuell)
npx supabase gen types typescript --project-id your-project-id > src/lib/database.types.ts
```

---

## 14. Deployment

### 14.1 Frontend-Deployment

**Build erstellen:**
```bash
npm run build
```

**Output:**
- Statische Dateien in `dist/` Ordner
- Kann auf jedem Static-Hosting gehostet werden:
  - Vercel
  - Netlify
  - AWS S3 + CloudFront
  - GitHub Pages
  - Cloudflare Pages

**Environment Variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 14.2 Backend-Deployment

**Supabase:**
- Bereits gehostet als Managed Service
- Kein zusätzliches Backend-Deployment nötig

**Edge Functions:**
- Automatisch deployed über Supabase
- Skalieren automatisch

### 14.3 Domain & SSL

**Custom Domain:**
1. DNS konfigurieren (A/CNAME Record)
2. SSL-Zertifikat automatisch via Hosting-Provider
3. HTTPS-Only erzwingen

---

## 15. Testing-Strategie

### 15.1 Unit Tests
- Business Logic in Utils/Helpers
- Custom Hooks
- Pure Functions

### 15.2 Integration Tests
- Komponenten mit Supabase-Interaktion
- Auth-Flow
- CRUD-Operationen

### 15.3 E2E Tests
- Happy-Path für Admin
- Happy-Path für Employee
- Kritische User-Journeys

### 15.4 Manuelle Tests
- Cross-Browser Testing
- Mobile Responsiveness
- Accessibility

---

## 16. Wartung & Support

### 16.1 Monitoring
- Supabase Dashboard für DB-Performance
- Error-Tracking (Sentry optional)
- Usage-Metrics

### 16.2 Backups
- Supabase automatische Backups (täglich)
- Manuelle Backups vor großen Änderungen

### 16.3 Updates
- Dependencies regelmäßig aktualisieren
- Security-Patches sofort einspielen
- Supabase-Updates automatisch

---

## 17. Offene Punkte / Zukünftige Features

### 17.1 Nice-to-Have Features
- PDF-Export der Wochenübersicht
- Email-Benachrichtigungen bei neuen Vertretungsanfragen
- Push-Notifications für Mobile
- Kalender-Integration (iCal, Google Calendar)
- Reporting & Analytics
- Mobile App (React Native)

### 17.2 Technische Verbesserungen
- Realtime-Updates via Supabase Realtime
- Offline-Modus mit Service Worker
- Progressive Web App (PWA)
- Lazy Loading von Komponenten
- Virtualisierung für große Listen

---

## 18. Glossar

**Bundesland:** Österreichisches Bundesland (z.B. Tirol, Wien)
**Region:** Geografische Untereinheit eines Bundeslandes (z.B. Innsbruck, Innsbruck Land)
**Termin:** Einzelner Pflegetermin mit Datum, Zeit und Klient
**Schicht:** Synonym für Termin
**Offener Termin:** Termin ohne initialen Mitarbeiter, kann von jedem im Bundesland übernommen werden
**Vertretung:** Übernahme eines Termins eines anderen Mitarbeiters
**Abwesenheit:** Zeitraum in dem ein Mitarbeiter nicht verfügbar ist (Urlaub, Krankheit)
**Wochenvorlage:** Wiederverwendbare Terminvorlage für eine typische Woche
**RLS:** Row Level Security - Datenbankebene-Sicherheit in PostgreSQL
**SPA:** Single Page Application
**Edge Function:** Serverless Function in Supabase Edge Runtime

---

## 19. Kontakt & Lizenz

**Projektname:** pflege network Terminplaner
**Version:** 1.0
**Lizenz:** Proprietary (oder Open Source License nach Wahl)
**Support:** [Support-Email einfügen]

---

**Ende des Pflichtenhefts**
