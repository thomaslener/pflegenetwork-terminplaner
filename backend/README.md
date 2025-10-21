# Django Backend für Terminplaner

Dieses Django Backend ersetzt die vorherige Supabase-Implementierung.

## Setup

### 1. Virtuelle Umgebung erstellen

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# oder
venv\Scripts\activate  # Windows
```

### 2. Abhängigkeiten installieren

```bash
pip install -r requirements.txt
```

### 3. Umgebungsvariablen konfigurieren

Erstellen Sie eine `.env` Datei basierend auf `.env.example`:

```bash
cp .env.example .env
```

Bearbeiten Sie `.env` und setzen Sie Ihre Werte:

```
DEBUG=True
SECRET_KEY=ihr-geheimer-schlüssel-hier
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

DB_NAME=terminplaner
DB_USER=postgres
DB_PASSWORD=ihr-passwort
DB_HOST=localhost
DB_PORT=5432
```

### 4. Datenbank erstellen

```bash
# PostgreSQL Datenbank erstellen
createdb terminplaner

# Oder mit psql:
psql -U postgres
CREATE DATABASE terminplaner;
\q
```

### 5. Migrationen ausführen

```bash
python manage.py makemigrations
python manage.py migrate
```

### 6. Superuser erstellen

```bash
python manage.py createsuperuser
```

### 7. Initiale Daten laden (optional)

Bundesländer und Regionen können über das Admin-Interface oder mit einem Datenimport-Skript geladen werden.

Österreichische Bundesländer:
- Burgenland
- Kärnten
- Niederösterreich
- Oberösterreich
- Salzburg
- Steiermark
- Tirol
- Vorarlberg
- Wien

### 8. Server starten

```bash
python manage.py runserver
```

Der Server läuft standardmäßig auf `http://localhost:8000`.

## API Endpoints

### Authentifizierung

- `POST /api/auth/login/` - Login (gibt Access und Refresh Token zurück)
- `POST /api/auth/refresh/` - Token erneuern
- `GET /api/auth/me/` - Aktuellen Benutzer abrufen

### Benutzer und Regionen

- `GET/POST /api/profiles/` - Benutzerprofile (nur Admin kann erstellen)
- `GET/PUT/PATCH/DELETE /api/profiles/{id}/` - Einzelnes Profil
- `GET/POST /api/regions/` - Regionen
- `GET/POST /api/federal-states/` - Bundesländer

### Schichten

- `GET/POST /api/shifts/` - Schichten
- `GET/PUT/PATCH/DELETE /api/shifts/{id}/` - Einzelne Schicht
- `POST /api/shifts/bulk_create/` - Mehrere Schichten erstellen

### Vorlagen

- `GET/POST /api/weekly-templates/` - Wochenvorlagen
- `GET/PUT/PATCH/DELETE /api/weekly-templates/{id}/` - Einzelne Vorlage
- `GET/POST /api/template-shifts/` - Vorlagen-Schichten

### Abwesenheiten

- `GET/POST /api/absences/` - Abwesenheiten
- `GET/PUT/PATCH/DELETE /api/absences/{id}/` - Einzelne Abwesenheit

### Klienten

- `GET/POST /api/clients/` - Klienten
- `GET/PUT/PATCH/DELETE /api/clients/{id}/` - Einzelner Klient

### Admin-Funktionen

- `POST /api/admin/create-user/` - Neuen Benutzer erstellen (nur Admin)
- `POST /api/admin/update-password/` - Passwort zurücksetzen (nur Admin)

## Berechtigungen

Das System implementiert rollenbasierte Zugriffskontrolle (RLS-Ersatz von Supabase):

### Admin
- Vollzugriff auf alle Daten
- Kann Benutzer erstellen und verwalten
- Kann alle Schichten, Abwesenheiten, etc. sehen und bearbeiten

### Employee
- Kann eigene Schichten sehen und bearbeiten
- Kann Schichten in eigener Region sehen
- Kann offene Schichten und Schichten, die Ersatz suchen, sehen
- Kann eigene Abwesenheiten verwalten
- Kann alle Abwesenheiten sehen (für Planung)
- Kann eigene Vorlagen verwalten
- Kann Kollegen in derselben Region sehen

## Unterschiede zu Supabase

### Authentifizierung
- Supabase Auth → Django JWT (Simple JWT)
- Supabase Session → JWT Access/Refresh Tokens
- `onAuthStateChange` → Muss im Frontend durch Polling/Timer ersetzt werden

### Datenbank
- Row Level Security (RLS) → Django Permissions und Queryset Filtering
- Supabase Triggers → Django Signals
- Edge Functions → Django API Views

### API-Aufrufe
- `supabase.from('table').select()` → `GET /api/table/`
- `supabase.from('table').insert()` → `POST /api/table/`
- `supabase.from('table').update()` → `PUT/PATCH /api/table/{id}/`
- `supabase.from('table').delete()` → `DELETE /api/table/{id}/`

## Entwicklung

### Admin-Interface

Das Django Admin-Interface ist verfügbar unter `http://localhost:8000/admin/`

### Tests

```bash
python manage.py test
```

### Neue Migration erstellen

```bash
python manage.py makemigrations
python manage.py migrate
```

## Deployment

Für Production:

1. Setzen Sie `DEBUG=False`
2. Generieren Sie einen sicheren `SECRET_KEY`
3. Konfigurieren Sie `ALLOWED_HOSTS` korrekt
4. Verwenden Sie einen Production-WSGI-Server (z.B. Gunicorn)
5. Nutzen Sie einen Reverse Proxy (z.B. Nginx)
6. Aktivieren Sie HTTPS
7. Konfigurieren Sie eine Production-Datenbank

```bash
pip install gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```
