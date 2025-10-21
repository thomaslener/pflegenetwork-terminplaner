# Migration von Supabase zu Django Backend

Diese Anleitung beschreibt die Schritte zur Migration des Terminplaners von Supabase zu Django.

## Backend Setup

### 1. Backend starten

```bash
cd backend

# Virtuelle Umgebung erstellen
python -m venv venv
source venv/bin/activate  # Linux/Mac
# oder venv\Scripts\activate  # Windows

# Abhängigkeiten installieren
pip install -r requirements.txt

# Umgebungsvariablen konfigurieren
cp .env.example .env
# Bearbeiten Sie .env mit Ihren Datenbankzugangsdaten

# Datenbank erstellen
createdb terminplaner

# Migrationen ausführen
python manage.py makemigrations
python manage.py migrate

# Superuser erstellen
python manage.py createsuperuser

# Server starten
python manage.py runserver
```

Der Backend-Server läuft nun auf `http://localhost:8000`.

### 2. Initiale Daten laden

Bundesländer über Django Shell hinzufügen:

```bash
python manage.py shell
```

```python
from core.models import FederalState

states = [
    'Burgenland', 'Kärnten', 'Niederösterreich', 'Oberösterreich',
    'Salzburg', 'Steiermark', 'Tirol', 'Vorarlberg', 'Wien'
]

for i, state in enumerate(states):
    FederalState.objects.create(name=state, sort_order=i)
```

## Frontend Setup

### 1. Umgebungsvariablen konfigurieren

```bash
# Im Root-Verzeichnis
cp .env.example .env
```

Die `.env` Datei sollte enthalten:
```
VITE_API_URL=http://localhost:8000/api
```

### 2. Dependencies aktualisieren

Die Supabase-Abhängigkeiten können entfernt werden (optional):

```bash
npm uninstall @supabase/supabase-js
```

### 3. Frontend starten

```bash
npm install
npm run dev
```

## Code-Änderungen

### API-Client

Der neue API-Client (`src/lib/api.ts`) ersetzt die Supabase-Client-Datei. Er bietet:

- JWT-basierte Authentifizierung
- RESTful API-Aufrufe
- Kompatible Schnittstelle zu Supabase (teilweise)

### Authentifizierung

**Vorher (Supabase):**
```typescript
import { supabase } from '../lib/supabase';

const { data, error } = await supabase.auth.signInWithPassword({
  email, password
});
```

**Nachher (Django):**
```typescript
import { auth } from '../lib/api';

const { data, error } = await auth.signInWithPassword({
  email, password
});
```

### Datenbank-Operationen

**Vorher (Supabase):**
```typescript
import { supabase } from '../lib/supabase';

// SELECT
const { data, error } = await supabase
  .from('shifts')
  .select('*')
  .eq('employee_id', userId);

// INSERT
const { data, error } = await supabase
  .from('shifts')
  .insert({ ... });

// UPDATE
const { data, error } = await supabase
  .from('shifts')
  .update({ ... })
  .eq('id', shiftId);

// DELETE
const { data, error } = await supabase
  .from('shifts')
  .delete()
  .eq('id', shiftId);
```

**Nachher (Django):**
```typescript
import { api } from '../lib/api';

// SELECT (Liste)
const { data, error } = await api.get('/shifts/', {
  employee_id: userId
});

// SELECT (Einzelnes Objekt)
const { data, error } = await api.get(`/shifts/${shiftId}/`);

// INSERT
const { data, error } = await api.post('/shifts/', {
  ...
});

// UPDATE
const { data, error } = await api.patch(`/shifts/${shiftId}/`, {
  ...
});

// DELETE
const { data, error } = await api.delete(`/shifts/${shiftId}/`);
```

### Tabellennamen-Mapping

| Supabase | Django API Endpoint |
|----------|-------------------|
| `profiles` | `/api/profiles/` |
| `shifts` | `/api/shifts/` |
| `absences` | `/api/absences/` |
| `weekly_templates` | `/api/weekly-templates/` |
| `template_shifts` | `/api/template-shifts/` |
| `regions` | `/api/regions/` |
| `federal_states` | `/api/federal-states/` |
| `clients` | `/api/clients/` |

### Edge Functions Ersatz

**Create User (vorher Supabase Edge Function):**
```typescript
// Vorher
const response = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, full_name, role, region_id })
});

// Nachher
const { data, error } = await api.post('/admin/create-user/', {
  email, full_name, role, region_id
});
```

**Update Password:**
```typescript
// Vorher
const response = await fetch(`${SUPABASE_URL}/functions/v1/update-user-password`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ user_id })
});

// Nachher
const { data, error } = await api.post('/admin/update-password/', {
  user_id
});
```

## Wichtige Unterschiede

### 1. Authentifizierung

- **Supabase**: Real-time auth state changes via `onAuthStateChange`
- **Django**: JWT tokens mit periodischem Refresh (alle 50 Minuten)

### 2. Real-time Features

Supabase bietet Real-time Subscriptions für Datenänderungen. Django benötigt:
- Polling (regelmäßiges Abfragen)
- WebSockets (z.B. Django Channels)
- Server-Sent Events

Für dieses Projekt wird Polling empfohlen, da keine kritischen Real-time Anforderungen bestehen.

### 3. Row Level Security (RLS)

- **Supabase**: RLS Policies in der Datenbank
- **Django**: Queryset-Filterung in den Views basierend auf Benutzerrolle

Die Zugriffskontrolle wird im Backend durch Custom Permissions und Queryset-Filterung implementiert.

### 4. Datenbank-IDs

- **Supabase**: UUIDs als String
- **Django**: UUIDs (kompatibel)

### 5. Datum/Zeit

- **Supabase**: ISO 8601 Strings
- **Django**: ISO 8601 Strings (kompatibel)

## Fehlerbehebung

### CORS-Fehler

Wenn Sie CORS-Fehler sehen, überprüfen Sie:

1. `backend/config/settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
```

2. Stellen Sie sicher, dass das Frontend auf einem der erlaubten Origins läuft

### Token-Fehler

Wenn Sie 401 Unauthorized Fehler erhalten:

1. Stellen Sie sicher, dass Sie eingeloggt sind
2. Überprüfen Sie, ob der Token im LocalStorage vorhanden ist
3. Versuchen Sie, sich abzumelden und erneut anzumelden

### Datenbankverbindung

Wenn das Backend nicht mit der Datenbank verbinden kann:

1. Überprüfen Sie die `.env` Datei im `backend/` Verzeichnis
2. Stellen Sie sicher, dass PostgreSQL läuft
3. Überprüfen Sie die Datenbankzugangsdaten

## Nächste Schritte

1. Backend starten und testen
2. Frontend anpassen (Komponenten aktualisieren)
3. Admin-Interface nutzen (`http://localhost:8000/admin/`)
4. Daten von Supabase exportieren und in Django importieren (falls vorhanden)
