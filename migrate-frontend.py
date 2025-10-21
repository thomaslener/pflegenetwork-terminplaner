#!/usr/bin/env python3
"""
Script to migrate frontend components from Supabase to Django API.
"""
import re
import os
from pathlib import Path

# Mapping of table names to API endpoints
TABLE_TO_ENDPOINT = {
    'profiles': 'profiles',
    'shifts': 'shifts',
    'absences': 'absences',
    'weekly_templates': 'weekly-templates',
    'template_shifts': 'template-shifts',
    'regions': 'regions',
    'federal_states': 'federal-states',
    'clients': 'clients',
}

def migrate_file(file_path):
    """Migrate a single TypeScript/TSX file from Supabase to Django API."""
    print(f"Migrating {file_path}...")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Replace imports
    content = re.sub(
        r"import\s+{[^}]*supabase[^}]*}\s+from\s+['\"]\.\.\/lib\/supabase['\"];?",
        "import { api } from '../lib/api';",
        content
    )
    content = re.sub(
        r"import\s+{[^}]*supabase[^}]*}\s+from\s+['\"]\.\.\/\.\.\/lib\/supabase['\"];?",
        "import { api } from '../../lib/api';",
        content
    )
    content = re.sub(
        r"import\s+{[^}]*supabase[^}]*}\s+from\s+['\"]\.\.\/\.\.\/\.\.\/lib\/supabase['\"];?",
        "import { api } from '../../../lib/api';",
        content
    )

    # Remove Supabase type imports
    content = re.sub(
        r"import\s+type\s+{[^}]*}\s+from\s+['\"]@supabase\/supabase-js['\"];?\n?",
        "",
        content
    )

    # Simple table operations patterns
    for table, endpoint in TABLE_TO_ENDPOINT.items():
        # SELECT all
        content = re.sub(
            rf"supabase\.from\(['\"]{ table}['\"]\)\.select\(['\"]?\*['\"]?\)",
            f"api.get('/{endpoint}/')",
            content
        )

        # SELECT with specific columns (keep as is, Django returns all by default)
        content = re.sub(
            rf"supabase\.from\(['\"]{ table}['\"]\)\.select\(['\"]([^'\"]+)['\"]\)",
            f"api.get('/{endpoint}/')",
            content
        )

        # INSERT
        content = re.sub(
            rf"supabase\.from\(['\"]{ table}['\"]\)\.insert\(([^)]+)\)",
            rf"api.post('/{endpoint}/', \1)",
            content
        )

    # Complex patterns requiring manual review
    # Mark them with comments for manual review
    if 'supabase.from' in content:
        print(f"  Warning: File still contains 'supabase.from' - manual review needed")

    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ Updated {file_path}")
        return True
    else:
        print(f"  - No changes needed for {file_path}")
        return False


def main():
    """Main migration function."""
    src_dir = Path('src')

    if not src_dir.exists():
        print("Error: src/ directory not found. Run this script from the project root.")
        return

    # Find all .tsx and .ts files (except lib/supabase.ts)
    files_to_migrate = []

    for ext in ['*.tsx', '*.ts']:
        files_to_migrate.extend(src_dir.rglob(ext))

    # Exclude certain files
    exclude_patterns = ['supabase.ts', 'database.types.ts', 'api.ts']
    files_to_migrate = [
        f for f in files_to_migrate
        if not any(pattern in str(f) for pattern in exclude_patterns)
    ]

    print(f"Found {len(files_to_migrate)} files to migrate\n")

    updated_count = 0
    for file_path in files_to_migrate:
        if migrate_file(file_path):
            updated_count += 1

    print(f"\n✓ Migration complete! Updated {updated_count}/{len(files_to_migrate)} files.")
    print("\nPlease review the changes and test the application.")
    print("Files that still contain 'supabase' references may need manual updates.")


if __name__ == '__main__':
    main()
