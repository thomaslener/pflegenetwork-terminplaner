import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Plus, Copy, Pencil, Trash2, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type WeeklyTemplate = Database['public']['Tables']['weekly_templates']['Row'];
type TemplateShift = Database['public']['Tables']['template_shifts']['Row'];

const DAYS_OF_WEEK = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

export function WeeklyTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<WeeklyTemplate[]>([]);
  const [templateShifts, setTemplateShifts] = useState<Record<string, TemplateShift[]>>({});
  const [loading, setLoading] = useState(true);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [editingShift, setEditingShift] = useState<TemplateShift | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [shiftFormData, setShiftFormData] = useState({
    day_of_week: 0,
    time_from: '',
    time_to: '',
    client_name: '',
    notes: '',
  });
  const [copyDate, setCopyDate] = useState('');
  const [showCopyDialog, setShowCopyDialog] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadTemplates();
    }
  }, [user]);

  const loadTemplates = async () => {
    if (!user) return;

    try {
      const { data: templatesData, error: templatesError } = await supabase
        .from('weekly_templates')
        .select('*')
        .eq('employee_id', user.id)
        .order('name');

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      if (templatesData && templatesData.length > 0) {
        const templateIds = templatesData.map(t => t.id);
        const { data: shiftsData, error: shiftsError } = await supabase
          .from('template_shifts')
          .select('*')
          .in('template_id', templateIds)
          .order('day_of_week')
          .order('time_from');

        if (shiftsError) throw shiftsError;

        const shiftsByTemplate: Record<string, TemplateShift[]> = {};
        shiftsData?.forEach(shift => {
          if (!shiftsByTemplate[shift.template_id]) {
            shiftsByTemplate[shift.template_id] = [];
          }
          shiftsByTemplate[shift.template_id].push(shift);
        });
        setTemplateShifts(shiftsByTemplate);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('weekly_templates')
        .insert([{ name: templateName, employee_id: user.id }]);

      if (error) throw error;

      setTemplateName('');
      setShowTemplateForm(false);
      loadTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Möchten Sie dieses Template wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('weekly_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    try {
      if (editingShift) {
        const { error } = await supabase
          .from('template_shifts')
          .update(shiftFormData)
          .eq('id', editingShift.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('template_shifts')
          .insert([{ ...shiftFormData, template_id: selectedTemplate }]);

        if (error) throw error;
      }

      setShiftFormData({ day_of_week: 0, time_from: '', time_to: '', client_name: '', notes: '' });
      setShowShiftForm(false);
      setEditingShift(null);
      loadTemplates();
    } catch (error) {
      console.error('Error saving shift:', error);
    }
  };

  const handleEditShift = (templateId: string, shift: TemplateShift) => {
    setSelectedTemplate(templateId);
    setEditingShift(shift);
    setShiftFormData({
      day_of_week: shift.day_of_week,
      time_from: shift.time_from,
      time_to: shift.time_to,
      client_name: shift.client_name,
      notes: shift.notes || '',
    });
    setShowShiftForm(true);
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Möchten Sie diesen Termin wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('template_shifts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadTemplates();
    } catch (error) {
      console.error('Error deleting shift:', error);
    }
  };

  const handleCopyTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCopyDialog || !user || !copyDate) return;

    try {
      const shifts = templateShifts[showCopyDialog] || [];
      const startDate = new Date(copyDate);

      const newShifts = shifts.map(shift => {
        const shiftDate = new Date(startDate);
        shiftDate.setDate(startDate.getDate() + shift.day_of_week);

        return {
          employee_id: user.id,
          shift_date: shiftDate.toISOString().split('T')[0],
          time_from: shift.time_from,
          time_to: shift.time_to,
          client_name: shift.client_name,
          notes: shift.notes || '',
        };
      });

      const { error } = await supabase
        .from('shifts')
        .insert(newShifts);

      if (error) throw error;

      alert('Template wurde erfolgreich kopiert!');
      setCopyDate('');
      setShowCopyDialog(null);
    } catch (error) {
      console.error('Error copying template:', error);
      alert('Fehler beim Kopieren des Templates');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Lädt...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Wochen-Vorlagen</h2>
        {!showTemplateForm && (
          <button
            onClick={() => setShowTemplateForm(true)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Template erstellen
          </button>
        )}
      </div>

      {showTemplateForm && (
        <form onSubmit={handleCreateTemplate} className="bg-slate-50 p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Neues Template</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template-Name *
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
                placeholder="z.B. Standard-Woche"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors"
              >
                Erstellen
              </button>
              <button
                type="button"
                onClick={() => setShowTemplateForm(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-4 py-2 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </form>
      )}

      {showShiftForm && (
        <form onSubmit={handleSaveShift} className="bg-slate-50 p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingShift ? 'Termin bearbeiten' : 'Termin hinzufügen'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wochentag *
              </label>
              <select
                value={shiftFormData.day_of_week}
                onChange={(e) => setShiftFormData({ ...shiftFormData, day_of_week: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                {DAYS_OF_WEEK.map((day, index) => (
                  <option key={index} value={index}>{day}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Klient *
              </label>
              <input
                type="text"
                value={shiftFormData.client_name}
                onChange={(e) => setShiftFormData({ ...shiftFormData, client_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Von *
              </label>
              <input
                type="time"
                value={shiftFormData.time_from}
                onChange={(e) => setShiftFormData({ ...shiftFormData, time_from: e.target.value })}
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
                value={shiftFormData.time_to}
                onChange={(e) => setShiftFormData({ ...shiftFormData, time_to: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anmerkungen
              </label>
              <textarea
                value={shiftFormData.notes}
                onChange={(e) => setShiftFormData({ ...shiftFormData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={2}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] px-4 py-2 rounded-lg transition-colors"
            >
              {editingShift ? 'Aktualisieren' : 'Hinzufügen'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowShiftForm(false);
                setEditingShift(null);
                setShiftFormData({ day_of_week: 0, time_from: '', time_to: '', client_name: '', notes: '' });
              }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {showCopyDialog && (
        <form onSubmit={handleCopyTemplate} className="bg-primary-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Template kopieren</h3>
          <p className="text-sm text-gray-600 mb-4">
            Wählen Sie das Startdatum der Woche (Montag), in die das Template kopiert werden soll.
          </p>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Startdatum (Montag) *
              </label>
              <input
                type="date"
                value={copyDate}
                onChange={(e) => setCopyDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] px-4 py-2 rounded-lg transition-colors"
            >
              Kopieren
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCopyDialog(null);
                setCopyDate('');
              }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {templates.map((template) => (
          <div key={template.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{template.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    setShowShiftForm(true);
                  }}
                  className="flex items-center gap-1 text-sm bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Termin
                </button>
                <button
                  onClick={() => setShowCopyDialog(template.id)}
                  className="flex items-center gap-1 text-sm bg-green-600 hover:bg-green-700 text-[#2e2e2e] px-3 py-1.5 rounded-lg transition-colors"
                  title="Template in Kalender kopieren"
                >
                  <Copy className="w-4 h-4" />
                  Kopieren
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Template löschen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4">
              {templateShifts[template.id]?.length > 0 ? (
                <div className="space-y-2">
                  {templateShifts[template.id].map((shift) => (
                    <div
                      key={shift.id}
                      className="flex items-start justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-medium text-gray-900">
                            {DAYS_OF_WEEK[shift.day_of_week]}
                          </span>
                          <span className="text-gray-600">
                            {shift.time_from.substring(0, 5)} - {shift.time_to.substring(0, 5)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-900">{shift.client_name}</div>
                        {shift.notes && (
                          <div className="text-sm text-gray-600 mt-1">{shift.notes}</div>
                        )}
                      </div>
                      <div className="flex gap-1 ml-4">
                        <button
                          onClick={() => handleEditShift(template.id, shift)}
                          className="p-1.5 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="Bearbeiten"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteShift(shift.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Keine Termine in diesem Template. Fügen Sie Termine hinzu.
                </div>
              )}
            </div>
          </div>
        ))}
        {templates.length === 0 && !showTemplateForm && (
          <div className="text-center py-12 text-gray-500 bg-white border border-slate-200 rounded-lg">
            Keine Templates vorhanden. Erstellen Sie Ihr erstes Template.
          </div>
        )}
      </div>
    </div>
  );
}
