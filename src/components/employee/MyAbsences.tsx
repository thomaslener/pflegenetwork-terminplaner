import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Plus, X, Pencil, Trash2, AlertTriangle } from 'lucide-react';

interface Absence {
  id: string;
  employee_id: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  reason: string;
  created_at: string;
  updated_at: string;
}

export function MyAbsences() {
  const { profile } = useAuth();
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    start_date: '',
    start_time: '00:00',
    end_date: '',
    end_time: '23:59',
    reason: '',
  });

  useEffect(() => {
    loadAbsences();
  }, [profile]);

  const loadAbsences = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('absences')
        .select('*')
        .eq('employee_id', profile.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setAbsences(data || []);
    } catch (error) {
      console.error('Error loading absences:', error);
      setErrorMessage('Fehler beim Laden der Abwesenheiten');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      start_date: '',
      start_time: '00:00',
      end_date: '',
      end_time: '23:59',
      reason: '',
    });
    setEditingAbsence(null);
    setShowForm(false);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setErrorMessage(null);

    if (formData.start_date > formData.end_date) {
      setErrorMessage('Das Enddatum muss nach dem Startdatum liegen');
      return;
    }

    if (formData.start_date === formData.end_date && formData.start_time > formData.end_time) {
      setErrorMessage('Die Endzeit muss nach der Startzeit liegen');
      return;
    }

    try {
      const absenceData = {
        employee_id: profile.id,
        start_date: formData.start_date,
        start_time: formData.start_time,
        end_date: formData.end_date,
        end_time: formData.end_time,
        reason: formData.reason,
      };

      if (editingAbsence) {
        const { error } = await supabase
          .from('absences')
          .update({ ...absenceData, updated_at: new Date().toISOString() })
          .eq('id', editingAbsence.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('absences')
          .insert([absenceData]);

        if (error) throw error;
      }

      resetForm();
      loadAbsences();
    } catch (error) {
      console.error('Error saving absence:', error);
      setErrorMessage('Fehler beim Speichern der Abwesenheit');
    }
  };

  const handleEdit = (absence: Absence) => {
    setEditingAbsence(absence);
    setFormData({
      start_date: absence.start_date,
      start_time: absence.start_time,
      end_date: absence.end_date,
      end_time: absence.end_time,
      reason: absence.reason || '',
    });
    setShowForm(true);
    setErrorMessage(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Möchten Sie diese Abwesenheit wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('absences')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadAbsences();
    } catch (error) {
      console.error('Error deleting absence:', error);
      setErrorMessage('Fehler beim Löschen der Abwesenheit');
    }
  };

  const formatDateRange = (absence: Absence) => {
    const startDate = new Date(absence.start_date);
    const endDate = new Date(absence.end_date);

    const startStr = startDate.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const endStr = endDate.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const startTime = absence.start_time.substring(0, 5);
    const endTime = absence.end_time.substring(0, 5);

    if (absence.start_date === absence.end_date) {
      return `${startStr}, ${startTime} - ${endTime}`;
    }

    return `${startStr} ${startTime} - ${endStr} ${endTime}`;
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Lädt...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Meine Abwesenheiten</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Neue Abwesenheit
        </button>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 font-medium">Fehler</p>
            <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {absences.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Keine Abwesenheiten erfasst</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {absences.map((absence) => (
              <div key={absence.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-orange-600" />
                      <span className="font-semibold text-gray-900">
                        {formatDateRange(absence)}
                      </span>
                    </div>
                    {absence.reason && (
                      <p className="text-gray-600 text-sm ml-7">{absence.reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(absence)}
                      className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Bearbeiten"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(absence.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingAbsence ? 'Abwesenheit bearbeiten' : 'Neue Abwesenheit'}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-800 font-medium">Fehler</p>
                    <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Von Datum *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Von Zeit *
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bis Datum *
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bis Zeit *
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grund (optional)
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  placeholder="z.B. Urlaub, Krankheit, Fortbildung..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  {editingAbsence ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
