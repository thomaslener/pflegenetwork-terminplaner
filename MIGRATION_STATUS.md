# Migration Status: Supabase → Django

## ✅ Backend (Vollständig)

### Django Projekt
- ✅ Projektstruktur erstellt (`backend/`)
- ✅ Settings konfiguriert mit CORS, JWT, PostgreSQL
- ✅ Django Models erstellt (8 Tabellen)
- ✅ Django Signals (ersetzt Supabase Triggers)
- ✅ Admin Interface konfiguriert
- ✅ REST API mit Django REST Framework
- ✅ Authentifizierung mit JWT (Simple JWT)
- ✅ Permissions implementiert (ersetzt RLS)
- ✅ Custom Views mit Queryset-Filterung
- ✅ API Endpoints für alle Ressourcen
- ✅ Setup-Skript erstellt

### Models
- ✅ User (ersetzt profiles + auth.users)
- ✅ FederalState (Bundesländer)
- ✅ Region
- ✅ Client
- ✅ Shift
- ✅ WeeklyTemplate
- ✅ TemplateShift
- ✅ Absence

### API Endpoints
- ✅ `/api/auth/login/` - Login
- ✅ `/api/auth/refresh/` - Token refresh
- ✅ `/api/auth/me/` - Current user
- ✅ `/api/profiles/` - User profiles
- ✅ `/api/regions/` - Regions
- ✅ `/api/federal-states/` - Federal states
- ✅ `/api/clients/` - Clients
- ✅ `/api/shifts/` - Shifts
- ✅ `/api/weekly-templates/` - Weekly templates
- ✅ `/api/template-shifts/` - Template shifts
- ✅ `/api/absences/` - Absences
- ✅ `/api/admin/create-user/` - Create user (admin)
- ✅ `/api/admin/update-password/` - Update password (admin)

## ✅ Frontend (Vollständig)

### Core Files
- ✅ `src/lib/api.ts` - Django API Client erstellt
- ✅ `src/contexts/AuthContext.tsx` - Auth Context aktualisiert
- ✅ `src/components/LoginPage.tsx` - Login migriert
- ✅ `.env.example` - Umgebungsvariablen aktualisiert

### Admin Components (6 Dateien)
- ✅ `AdminDashboard.tsx` - Migriert
- ✅ `EmployeeManagement.tsx` - Vollständig migriert (manuell)
- ✅ `AdminShiftManagement.tsx` - Migriert
- ✅ `RegionManagement.tsx` - Migriert
- ✅ `ClientManagement.tsx` - Migriert
- ✅ `AbsenceManagement.tsx` - Migriert
- ✅ `WeeklyOverview.tsx` - Migriert

### Employee Components (5 Dateien)
- ✅ `EmployeeDashboard.tsx` - Migriert
- ✅ `MyShifts.tsx` - Migriert
- ✅ `MyAbsences.tsx` - Migriert
- ✅ `WeeklyOverviewReadOnly.tsx` - Migriert
- ✅ `WeeklyTemplates.tsx` - Migriert

### Shared Components (3 Dateien)
- ✅ `ClientAutocomplete.tsx` - Migriert
- ✅ `ShiftForm.tsx` - Migriert
- ✅ `ShiftList.tsx` - Migriert

### Migration Tools
- ✅ `migrate-frontend.py` - Automatisches Migrations-Skript
- ✅ `MIGRATION_GUIDE.md` - Vollständige Dokumentation

## 📋 Nächste Schritte

### Backend Setup
```bash
cd backend
./setup.sh
# Oder manuell:
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Bearbeiten Sie .env
createdb terminplaner
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend Setup
```bash
# Im Root-Verzeichnis
cp .env.example .env
# Setzen Sie VITE_API_URL=http://localhost:8000/api
npm install
npm run dev
```

## ⚠️ Wichtige Hinweise

### Unterschiede zu Supabase

1. **Real-time Features**: Django nutzt Polling statt Websockets
   - AuthContext hat 50-Minuten Token-Refresh-Interval
   - Keine automatischen Real-time Updates für Daten

2. **API-Aufrufe**: RESTful statt Supabase Query Builder
   - `supabase.from('table').select()` → `api.get('/table/')`
   - IDs müssen in der URL übergeben werden: `api.get('/table/id/')`

3. **Authentifizierung**: JWT statt Supabase Auth
   - Tokens werden im LocalStorage gespeichert
   - Manuelle Token-Verwaltung im Frontend

4. **Permissions**: Django Permissions statt RLS
   - Filtering passiert im Backend (QuerySet)
   - Gleiche Logik, andere Implementierung

### Breaking Changes

- ❌ Supabase Edge Functions entfernt → Django API Endpoints
- ❌ Supabase Real-time entfernt → Manuelle Daten-Refresh
- ❌ `onAuthStateChange` entfernt → Polling
- ❌ `database.types.ts` kann entfernt werden (optional)
- ❌ `supabase.ts` kann entfernt werden

### Optional: Aufräumen

```bash
# Supabase Dateien entfernen (optional)
rm -rf supabase/
rm src/lib/supabase.ts
rm src/lib/database.types.ts

# Supabase Dependencies entfernen
npm uninstall @supabase/supabase-js
```

## 🧪 Testing

1. Backend starten: `cd backend && python manage.py runserver`
2. Frontend starten: `npm run dev`
3. Admin-Login testen
4. CRUD-Operationen testen:
   - Personen erstellen/bearbeiten/löschen
   - Schichten erstellen/bearbeiten/löschen
   - Regionen verwalten
   - Klienten verwalten
   - Abwesenheiten verwalten

## 📚 Dokumentation

- `backend/README.md` - Django Backend Dokumentation
- `MIGRATION_GUIDE.md` - Vollständige Migrations-Anleitung
- `migrate-frontend.py` - Frontend-Migrations-Skript

## ✨ Features

Alle Supabase-Features wurden erfolgreich migriert:

- ✅ Benutzer-Authentifizierung
- ✅ Rollen-basierte Zugriffskontrolle (Admin/Employee)
- ✅ Schichtverwaltung
- ✅ Wochenvorlagen
- ✅ Abwesenheitsverwaltung
- ✅ Regionen und Bundesländer
- ✅ Klientenverwaltung
- ✅ Drag & Drop Sortierung
- ✅ Temporäre Passwörter für neue Benutzer
- ✅ Passwort-Reset durch Admin
