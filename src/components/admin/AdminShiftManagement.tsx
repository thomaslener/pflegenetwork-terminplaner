import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Copy, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import type { Database } from '../../lib/database.types';
import { ShiftForm } from '../shifts/ShiftForm';
import { ShiftList } from '../shifts/ShiftList';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Shift = Database['public']['Tables']['shifts']['Row'];
type WeeklyTemplate = Database['public']['Tables']['weekly_templates']['Row'];
type TemplateShift = Database['public']['Tables']['template_shifts']['Row'];

interface TemplateWithShifts extends WeeklyTemplate {
  template_shifts: TemplateShift[];
}

export function AdminShiftManagement() {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [templates, setTemplates] = useState<TemplateWithShifts[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<TemplateWithShifts | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'shifts' | 'templates'>('shifts');
  const [templateName, setTemplateName] = useState('');
  const [templateShifts, setTemplateShifts] = useState<Omit<TemplateShift, 'id' | 'template_id' | 'created_at'>[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadShifts();
      loadTemplates();
    }
  }, [selectedEmployee, currentDate]);

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
      if (data && data.length > 0) {
        setSelectedEmployee(data[0].id);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadShifts = async () => {
    if (!selectedEmployee) return;

    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', selectedEmployee)
        .gte('shift_date', startOfMonth.toISOString().split('T')[0])
        .lte('shift_date', endOfMonth.toISOString().split('T')[0])
        .order('shift_date')
        .order('time_from');

      if (error) throw error;
      setShifts(data || []);
    } catch (error) {
      console.error('Error loading shifts:', error);
    }
  };

  const loadTemplates = async () => {
    if (!selectedEmployee) return;

    try {
      const { data, error } = await supabase
        .from('weekly_templates')
        .select(`
          *,
          template_shifts (*)
        `)
        .eq('employee_id', selectedEmployee)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const checkTimeOverlap = (shift1TimeFrom: string, shift1TimeTo: string, shift2TimeFrom: string, shift2TimeTo: string): boolean => {
    return (shift1TimeFrom < shift2TimeTo && shift1TimeTo > shift2TimeFrom);
  };

  const handleSaveShift = async (shiftData: any) => {
    try {
      // If it's an open shift, skip overlap check
      if (!shiftData.open_shift) {
        let query = supabase
          .from('shifts')
          .select('*')
          .eq('employee_id', selectedEmployee)
          .eq('shift_date', shiftData.shift_date);

        if (editingShift?.id) {
          query = query.neq('id', editingShift.id);
        }

        const { data: existingShifts, error: queryError } = await query;

        if (queryError) throw queryError;

        if (existingShifts && existingShifts.length > 0) {
          for (const existing of existingShifts) {
            if (checkTimeOverlap(shiftData.time_from, shiftData.time_to, existing.time_from, existing.time_to)) {
              setErrorMessage('Der Termin überschneidet sich mit einem bestehenden Termin der Person an diesem Tag.');
              throw new Error('Zeitüberschneidung');
            }
          }
        }
      }

      if (editingShift) {
        const { error } = await supabase
          .from('shifts')
          .update({ ...shiftData, updated_at: new Date().toISOString() })
          .eq('id', editingShift.id);

        if (error) throw error;
      } else {
        const insertData = shiftData.open_shift
          ? { ...shiftData, employee_id: null }
          : { ...shiftData, employee_id: selectedEmployee };

        const { error } = await supabase
          .from('shifts')
          .insert([insertData]);

        if (error) throw error;
      }

      setShowShiftForm(false);
      setEditingShift(null);
      loadShifts();
    } catch (error) {
      console.error('Error saving shift:', error);
      throw error;
    }
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setShowShiftForm(true);
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Möchten Sie diesen Termin wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadShifts();
    } catch (error) {
      console.error('Error deleting shift:', error);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      alert('Bitte geben Sie einen Namen für das Template ein.');
      return;
    }

    try {
      if (editingTemplate) {
        const { error: updateError } = await supabase
          .from('weekly_templates')
          .update({ name: templateName, updated_at: new Date().toISOString() })
          .eq('id', editingTemplate.id);

        if (updateError) throw updateError;

        const { error: deleteError } = await supabase
          .from('template_shifts')
          .delete()
          .eq('template_id', editingTemplate.id);

        if (deleteError) throw deleteError;

        if (templateShifts.length > 0) {
          const { error: insertError } = await supabase
            .from('template_shifts')
            .insert(templateShifts.map(ts => ({ ...ts, template_id: editingTemplate.id })));

          if (insertError) throw insertError;
        }
      } else {
        const { data: templateData, error: templateError } = await supabase
          .from('weekly_templates')
          .insert([{ employee_id: selectedEmployee, name: templateName }])
          .select()
          .single();

        if (templateError) throw templateError;

        if (templateShifts.length > 0 && templateData) {
          const { error: shiftsError } = await supabase
            .from('template_shifts')
            .insert(templateShifts.map(ts => ({ ...ts, template_id: templateData.id })));

          if (shiftsError) throw shiftsError;
        }
      }

      setShowTemplateForm(false);
      setEditingTemplate(null);
      setTemplateName('');
      setTemplateShifts([]);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Fehler beim Speichern des Templates');
    }
  };

  const handleEditTemplate = (template: TemplateWithShifts) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateShifts(template.template_shifts.map(ts => ({
      day_of_week: ts.day_of_week,
      time_from: ts.time_from,
      time_to: ts.time_to,
      client_name: ts.client_name,
      notes: ts.notes || '',
    })));
    setShowTemplateForm(true);
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

  const handleApplyTemplate = async (template: TemplateWithShifts) => {
    const weekStart = prompt('Geben Sie das Startdatum der Woche ein (YYYY-MM-DD):');
    if (!weekStart) return;

    const startDate = new Date(weekStart);
    if (isNaN(startDate.getTime())) {
      alert('Ungültiges Datum');
      return;
    }

    try {
      const shiftsToInsert = template.template_shifts.map(ts => {
        const shiftDate = new Date(startDate);
        shiftDate.setDate(shiftDate.getDate() + ts.day_of_week);

        return {
          employee_id: selectedEmployee,
          shift_date: shiftDate.toISOString().split('T')[0],
          time_from: ts.time_from,
          time_to: ts.time_to,
          client_name: ts.client_name,
          notes: ts.notes,
        };
      });

      for (const newShift of shiftsToInsert) {
        const { data: existingShifts, error: queryError } = await supabase
          .from('shifts')
          .select('*')
          .eq('employee_id', selectedEmployee)
          .eq('shift_date', newShift.shift_date);

        if (queryError) throw queryError;

        if (existingShifts && existingShifts.length > 0) {
          for (const existing of existingShifts) {
            if (checkTimeOverlap(newShift.time_from, newShift.time_to, existing.time_from, existing.time_to)) {
              const errorMsg = `Zeitüberschneidung am ${new Date(newShift.shift_date).toLocaleDateString('de-DE')}: Das Template kann nicht angewendet werden, da Termine sich überschneiden würden.`;
              setErrorMessage(errorMsg);
              throw new Error(errorMsg);
            }
          }
        }
      }

      const { error } = await supabase
        .from('shifts')
        .insert(shiftsToInsert);

      if (error) throw error;
      alert('Template erfolgreich angewendet!');
      loadShifts();
    } catch (error: any) {
      console.error('Error applying template:', error);
      alert(error.message || 'Fehler beim Anwenden des Templates');
    }
  };

  const addTemplateShift = () => {
    setTemplateShifts([
      ...templateShifts,
      {
        day_of_week: 0,
        time_from: '09:00',
        time_to: '17:00',
        client_name: '',
        notes: '',
      },
    ]);
  };

  const updateTemplateShift = (index: number, field: string, value: any) => {
    const updated = [...templateShifts];
    updated[index] = { ...updated[index], [field]: value };
    setTemplateShifts(updated);
  };

  const removeTemplateShift = (index: number) => {
    setTemplateShifts(templateShifts.filter((_, i) => i !== index));
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthName = currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Lädt...</div>;
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Keine Personen vorhanden. Fügen Sie zuerst Personen hinzu.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Termine & Templates verwalten</h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Person
          </label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name || employee.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-slate-100 rounded-lg p-1 flex gap-1">
        <button
          onClick={() => setView('shifts')}
          className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
            view === 'shifts'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Termine
        </button>
        <button
          onClick={() => setView('templates')}
          className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
            view === 'templates'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Wochen-Vorlagen
        </button>
      </div>

      {view === 'shifts' && (
        <>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={previousMonth}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Vorheriger Monat"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-4 py-2 border border-gray-300 rounded-lg bg-white min-w-[180px] text-center">
                <span className="font-medium text-gray-900 capitalize">{monthName}</span>
              </div>
              <button
                onClick={nextMonth}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Nächster Monat"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {selectedEmployee && !showShiftForm && (
              <button
                onClick={() => setShowShiftForm(true)}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors ml-auto"
              >
                <Plus className="w-5 h-5" />
                Termin hinzufügen
              </button>
            )}
          </div>

          {showShiftForm && (
            <ShiftForm
              shift={editingShift}
              onSave={handleSaveShift}
              onCancel={() => {
                setShowShiftForm(false);
                setEditingShift(null);
              }}
            />
          )}

          <ShiftList
            shifts={shifts}
            onEdit={handleEditShift}
            onDelete={handleDeleteShift}
          />
        </>
      )}

      {view === 'templates' && (
        <>
          <div className="flex items-center justify-between">
            {!showTemplateForm && (
              <button
                onClick={() => {
                  setShowTemplateForm(true);
                  setEditingTemplate(null);
                  setTemplateName('');
                  setTemplateShifts([]);
                }}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Template erstellen
              </button>
            )}
          </div>

          {showTemplateForm && (
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTemplate ? 'Template bearbeiten' : 'Neues Template'}
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template-Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="z.B. Standardwoche"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Termine
                  </label>
                  <button
                    onClick={addTemplateShift}
                    className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                  >
                    <Plus className="w-4 h-4" />
                    Termin hinzufügen
                  </button>
                </div>

                <div className="space-y-3">
                  {templateShifts.map((shift, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Wochentag</label>
                          <select
                            value={shift.day_of_week}
                            onChange={(e) => updateTemplateShift(index, 'day_of_week', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            {dayNames.map((day, i) => (
                              <option key={i} value={i}>{day}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Kunde</label>
                          <input
                            type="text"
                            value={shift.client_name}
                            onChange={(e) => updateTemplateShift(index, 'client_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Von</label>
                          <input
                            type="time"
                            value={shift.time_from}
                            onChange={(e) => updateTemplateShift(index, 'time_from', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Bis</label>
                          <input
                            type="time"
                            value={shift.time_to}
                            onChange={(e) => updateTemplateShift(index, 'time_to', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Notizen</label>
                        <input
                          type="text"
                          value={shift.notes}
                          onChange={(e) => updateTemplateShift(index, 'notes', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <button
                        onClick={() => removeTemplateShift(index)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Entfernen
                      </button>
                    </div>
                  ))}
                  {templateShifts.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Keine Termine hinzugefügt. Klicken Sie auf "Termin hinzufügen".
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveTemplate}
                  className="bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  {editingTemplate ? 'Aktualisieren' : 'Erstellen'}
                </button>
                <button
                  onClick={() => {
                    setShowTemplateForm(false);
                    setEditingTemplate(null);
                    setTemplateName('');
                    setTemplateShifts([]);
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <div key={template.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleApplyTemplate(template)}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="Auf Woche anwenden"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="p-1.5 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      title="Bearbeiten"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {template.template_shifts.length === 0 ? (
                    <p className="text-sm text-gray-500">Keine Termine definiert</p>
                  ) : (
                    template.template_shifts.map((shift, index) => (
                      <div key={index} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="font-medium">{dayNames[shift.day_of_week]}:</span>
                        <span>{shift.time_from} - {shift.time_to}</span>
                        <span className="text-gray-400">•</span>
                        <span>{shift.client_name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
            {templates.length === 0 && !showTemplateForm && (
              <div className="col-span-full text-center py-12 text-gray-500">
                Keine Templates vorhanden. Erstellen Sie Ihr erstes Template.
              </div>
            )}
          </div>
        </>
      )}

      {errorMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center gap-3 p-6 border-b border-gray-200">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Zeitüberschneidung
              </h3>
            </div>

            <div className="p-6">
              <p className="text-gray-700 leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setErrorMessage(null)}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-medium rounded-lg transition-colors"
              >
                Verstanden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
