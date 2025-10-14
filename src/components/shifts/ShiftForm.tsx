import { useState, useEffect } from 'react';
import type { Database } from '../../lib/database.types';
import { ClientAutocomplete } from '../shared/ClientAutocomplete';

type Shift = Database['public']['Tables']['shifts']['Row'];

interface ShiftFormProps {
  shift: Shift | null;
  onSave: (shiftData: any) => Promise<void>;
  onCancel: () => void;
  onSeekReplacement?: (shiftId: string) => Promise<void>;
}

export function ShiftForm({ shift, onSave, onCancel, onSeekReplacement }: ShiftFormProps) {
  const [formData, setFormData] = useState({
    shift_date: '',
    time_from: '',
    time_to: '',
    client_name: '',
    notes: '',
    open_shift: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shift) {
      setFormData({
        shift_date: shift.shift_date,
        time_from: shift.time_from,
        time_to: shift.time_to,
        client_name: shift.client_name,
        notes: shift.notes || '',
        open_shift: !!shift.open_shift,
      });
    }
  }, [shift]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await onSave(formData);
    } catch (error: any) {
      setError(error.message || 'Fehler beim Speichern des Termins');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 p-6 rounded-lg border border-slate-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {shift ? 'Termin bearbeiten' : 'Neuer Termin'}
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Datum *
          </label>
          <input
            type="date"
            value={formData.shift_date}
            onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Klient *
          </label>
          <ClientAutocomplete
            value={formData.client_name}
            onChange={(value) => setFormData({ ...formData, client_name: value })}
            required
            placeholder="Klient suchen..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Von *
          </label>
          <input
            type="time"
            value={formData.time_from}
            onChange={(e) => setFormData({ ...formData, time_from: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bis *
          </label>
          <input
            type="time"
            value={formData.time_to}
            onChange={(e) => setFormData({ ...formData, time_to: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anmerkungen
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            rows={3}
            placeholder="Optional"
          />
        </div>

        <div className="md:col-span-2">
          <label className="flex items-start gap-3 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={formData.open_shift}
              onChange={(e) => setFormData({ ...formData, open_shift: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span>
              Offener Termin
              <span className="block text-xs font-normal text-gray-500">
                Offene Termine erscheinen für Partner im selben Bundesland in einer eigenen Liste.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          type="submit"
          disabled={saving}
          className="bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Speichert...' : shift ? 'Aktualisieren' : 'Erstellen'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          Abbrechen
        </button>
        {shift && onSeekReplacement && !shift.seeking_replacement && (
          <button
            type="button"
            onClick={() => onSeekReplacement(shift.id)}
            disabled={saving}
            className="ml-auto bg-yellow-600 hover:bg-yellow-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Vertretung finden
          </button>
        )}
      </div>
    </form>
  );
}
