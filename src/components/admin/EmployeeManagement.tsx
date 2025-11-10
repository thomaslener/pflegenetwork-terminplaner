import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Pencil, Trash2, Shield, User, GripVertical } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

type FederalState = Database['public']['Tables']['regions']['Row'];
type District = Database['public']['Tables']['districts']['Row'];

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [federalStates, setFederalStates] = useState<FederalState[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Profile | null>(null);
  const [draggedEmployee, setDraggedEmployee] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'employee' as 'admin' | 'employee',
    region_id: '',
    new_password: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [employeesRes, districtsRes, statesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('region_id').order('sort_order'),
        supabase.from('districts').select('*').order('sort_order'),
        supabase.from('regions').select('*').order('sort_order'),
      ]);

      if (employeesRes.error) throw employeesRes.error;
      if (districtsRes.error) throw districtsRes.error;
      if (statesRes.error) throw statesRes.error;

      setEmployees(employeesRes.data || []);
      setDistricts(districtsRes.data || []);
      setFederalStates(statesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            role: formData.role,
            region_id: formData.region_id || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingEmployee.id);

        if (error) throw error;

        // Update password if provided
        if (formData.new_password) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('Not authenticated');

          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-password`;
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: editingEmployee.id,
              new_password: formData.new_password,
            }),
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || 'Fehler beim Aktualisieren des Passworts');
          }
        }
      } else {
        // Calculate sort order
        const regionEmployees = employees.filter(e => e.region_id === formData.region_id);
        const maxSortOrder = regionEmployees.length > 0
          ? Math.max(...regionEmployees.map(e => e.sort_order || 0))
          : 0;

        // Call edge function to create user
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
            region_id: formData.region_id || null,
            sort_order: maxSortOrder + 1,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Fehler beim Erstellen der Person');
        }

        alert(`Person erstellt!\n\nE-Mail: ${formData.email}\nTemporäres Passwort: ${result.temporaryPassword}\n\nBitte notieren Sie das Passwort und geben Sie es der Person weiter.`);
      }

      setFormData({ email: '', full_name: '', role: 'employee', region_id: '', new_password: '' });
      setShowForm(false);
      setEditingEmployee(null);
      loadData();
    } catch (error: any) {
      console.error('Error saving employee:', error);
      alert(error.message || 'Fehler beim Speichern der Person');
    }
  };

  const handleEdit = (employee: Profile) => {
    setEditingEmployee(employee);
    setFormData({
      email: employee.email,
      full_name: employee.full_name || '',
      role: employee.role,
      region_id: employee.region_id || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Möchten Sie diese Person wirklich löschen?')) return;

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Fehler beim Löschen der Person');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingEmployee(null);
    setFormData({ email: '', full_name: '', role: 'employee', region_id: '' });
  };

  const handleDragStart = (employee: Profile) => {
    setDraggedEmployee(employee);
  };

  const handleDragOver = (e: React.DragEvent, targetEmployee: Profile) => {
    e.preventDefault();

    if (!draggedEmployee || draggedEmployee.id === targetEmployee.id) return;
    if (draggedEmployee.region_id !== targetEmployee.region_id) return;

    const regionEmployees = employees.filter(e => e.region_id === targetEmployee.region_id);
    const draggedIndex = regionEmployees.findIndex(e => e.id === draggedEmployee.id);
    const targetIndex = regionEmployees.findIndex(e => e.id === targetEmployee.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newRegionEmployees = [...regionEmployees];
    const [removed] = newRegionEmployees.splice(draggedIndex, 1);
    newRegionEmployees.splice(targetIndex, 0, removed);

    const otherEmployees = employees.filter(e => e.region_id !== targetEmployee.region_id);
    const newEmployees = [...otherEmployees, ...newRegionEmployees].sort((a, b) => {
      if (a.region_id === b.region_id) return 0;
      if (!a.region_id) return 1;
      if (!b.region_id) return -1;
      return (a.region_id || '').localeCompare(b.region_id || '');
    });

    setEmployees(newEmployees);
  };

  const handleDragEnd = async () => {
    if (!draggedEmployee) return;

    try {
      const regionEmployees = employees.filter(e => e.region_id === draggedEmployee.region_id);

      for (let i = 0; i < regionEmployees.length; i++) {
        const { error } = await supabase
          .from('profiles')
          .update({ sort_order: i + 1 })
          .eq('id', regionEmployees[i].id);

        if (error) throw error;
      }

      setDraggedEmployee(null);
      loadData();
    } catch (error) {
      console.error('Error updating sort order:', error);
      loadData();
    }
  };

  const getDistrictName = (districtId: string | null) => {
    if (!districtId) return null;
    return districts.find((d) => d.id === districtId)?.name || null;
  };

  const groupEmployeesByDistrict = () => {
    const grouped: { district: District | null; employees: Profile[] }[] = [];

    districts.forEach(district => {
      const districtEmployees = employees.filter(e => e.region_id === district.id);
      if (districtEmployees.length > 0) {
        grouped.push({ district, employees: districtEmployees });
      }
    });

    const noDistrictEmployees = employees.filter(e => !e.region_id);
    if (noDistrictEmployees.length > 0) {
      grouped.push({ district: null, employees: noDistrictEmployees });
    }

    return grouped;
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Lädt...</div>;
  }

  const groupedEmployees = groupEmployeesByDistrict();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Personen verwalten</h2>
          <p className="text-sm text-gray-600 mt-1">
            Ziehen Sie die Personen, um die Reihenfolge innerhalb der Region zu ändern
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Person hinzufügen
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingEmployee ? 'Person bearbeiten' : 'Neue Person'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-Mail *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
                disabled={!!editingEmployee}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vollständiger Name
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rolle *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'employee' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="employee">Person</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Region
              </label>
              <select
                value={formData.region_id}
                onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Keine Region</option>
                {federalStates.map((state) => {
                  const stateDistricts = districts.filter(d => d.federal_state_id === state.id);
                  return stateDistricts.length > 0 ? (
                    <optgroup key={state.id} label={state.name}>
                      {stateDistricts.map((district) => (
                        <option key={district.id} value={district.id}>
                          {district.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null;
                })}
              </select>
            </div>
            {editingEmployee && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Neues Passwort
                </label>
                <input
                  type="password"
                  value={formData.new_password}
                  onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Leer lassen, um nicht zu ändern"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Geben Sie ein neues Passwort ein, um das bestehende zu ändern
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors"
              >
                {editingEmployee ? 'Aktualisieren' : 'Erstellen'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-4 py-2 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="p-6 space-y-6">
        {groupedEmployees.map(({ district, employees: regionEmployees }) => (
          <div key={district?.id || 'no-region'} className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 px-2">
              {district?.name || 'Ohne Region'}
            </h3>
            <div className="space-y-2">
              {regionEmployees.map((employee) => (
                <div
                  key={employee.id}
                  draggable
                  onDragStart={() => handleDragStart(employee)}
                  onDragOver={(e) => handleDragOver(e, employee)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all cursor-move ${
                    draggedEmployee?.id === employee.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {employee.full_name || 'Unbenannt'}
                      </div>
                      <div className="text-sm text-gray-500 truncate">{employee.email}</div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                        employee.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {employee.role === 'admin' && <Shield className="w-3 h-3" />}
                      {employee.role === 'admin' ? 'Administrator' : 'Person'}
                    </span>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(employee)}
                        className="p-1.5 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="Bearbeiten"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {employees.length === 0 && !showForm && (
          <div className="text-center py-12 text-gray-500 bg-white border border-slate-200 rounded-lg">
            Keine Personen vorhanden. Fügen Sie Ihre erste Person hinzu.
          </div>
        )}
      </div>
    </div>
  );
}
