#!/bin/bash
# Django Backend Setup Script

set -e

echo "=== Django Backend Setup ==="
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your database credentials!"
    echo ""
fi

# Create database (optional)
read -p "Create database 'terminplaner'? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    createdb terminplaner || echo "Database might already exist or you need to create it manually"
fi

# Run migrations
echo "Running migrations..."
python manage.py makemigrations
python manage.py migrate

# Create superuser
read -p "Create superuser? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    python manage.py createsuperuser
fi

# Load initial data
read -p "Load Austrian federal states? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    python manage.py shell << EOF
from core.models import FederalState

states = [
    ('Burgenland', 1),
    ('Kärnten', 2),
    ('Niederösterreich', 3),
    ('Oberösterreich', 4),
    ('Salzburg', 5),
    ('Steiermark', 6),
    ('Tirol', 7),
    ('Vorarlberg', 8),
    ('Wien', 9)
]

for name, order in states:
    FederalState.objects.get_or_create(
        name=name,
        defaults={'sort_order': order}
    )

print('✓ Federal states loaded')
EOF
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To start the development server:"
echo "  source venv/bin/activate"
echo "  python manage.py runserver"
echo ""
echo "Admin interface: http://localhost:8000/admin/"
echo "API endpoints: http://localhost:8000/api/"
