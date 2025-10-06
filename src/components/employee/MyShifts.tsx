import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';
import { ShiftForm } from '../shifts/ShiftForm';
import { ShiftList } from '../shifts/ShiftList';

type Shift = Database['public']['Tables']['shifts']['Row'];

type ShiftWithEmployee = Shift & {
  employee_name?: string;
  original_employee_name?: string;
};

export function MyShifts() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<ShiftWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (user) {
      loadShifts();
    }
  }, [user, currentDate]);

  const loadShifts = async () => {
    if (!user) return;

    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data: ownShifts, error: ownError } = await supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', user.id)
        .gte('shift_date', startOfMonth.toISOString().split('T')[0])
        .lte('shift_date', endOfMonth.toISOString().split('T')[0])
        .order('shift_date')
        .order('time_from');

      if (ownError) throw ownError;

      const originalEmployeeIds = [...new Set(ownShifts?.filter(s => s.original_employee_id).map(s => s.original_employee_id) || [])];
      const { data: originalProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', originalEmployeeIds);

      const originalProfileMap = new Map(originalProfiles?.map(p => [p.id, p.full_name]) || []);

      const ownShiftsWithNames = ownShifts?.map(shift => ({
        ...shift,
        original_employee_name: shift.original_employee_id ? originalProfileMap.get(shift.original_employee_id) : undefined
      })) || [];

      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('region_id')
        .eq('id', user.id)
        .single();

      let replacementShiftsWithNames: ShiftWithEmployee[] = [];

      if (currentUserProfile?.region_id) {
        const { data: currentUserRegion } = await supabase
          .from('regions')
          .select('federal_state_id')
          .eq('id', currentUserProfile.region_id)
          .single();

        if (currentUserRegion?.federal_state_id) {
          const { data: sameFederalStateRegions } = await supabase
            .from('regions')
            .select('id')
            .eq('federal_state_id', currentUserRegion.federal_state_id);

          const regionIds = sameFederalStateRegions?.map(r => r.id) || [];

          const { data: sameFederalStateEmployees } = await supabase
            .from('profiles')
            .select('id')
            .in('region_id', regionIds);

          const employeeIdsInSameFederalState = sameFederalStateEmployees?.map(e => e.id) || [];

          const { data: replacementShifts, error: replacementError } = await supabase
            .from('shifts')
            .select('*')
            .eq('seeking_replacement', true)
            .in('employee_id', employeeIdsInSameFederalState)
            .neq('employee_id', user.id)
            .gte('shift_date', startOfMonth.toISOString().split('T')[0])
            .lte('shift_date', endOfMonth.toISOString().split('T')[0])
            .order('shift_date')
            .order('time_from');

          if (replacementError) throw replacementError;

          const employeeIds = [...new Set(replacementShifts?.map(s => s.employee_id) || [])];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', employeeIds);

          const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

          replacementShiftsWithNames = replacementShifts?.map(shift => ({
            ...shift,
            employee_name: profileMap.get(shift.employee_id) || 'Unbekannt'
          })) || [];
        }
      }

      const allShifts = [...ownShiftsWithNames, ...replacementShiftsWithNames];
      const uniqueShifts = Array.from(new Map(allShifts.map(s => [s.id, s])).values())
        .sort((a, b) => {
          const dateCompare = a.shift_date.localeCompare(b.shift_date);
          if (dateCompare !== 0) return dateCompare;
          return a.time_from.localeCompare(b.time_from);
        });

      setShifts(uniqueShifts);
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShift = async (shiftData: any) => {
    if (!user) return;

    try {
      if (editingShift) {
        const { error } = await supabase
          .from('shifts')
          .update({ ...shiftData, updated_at: new Date().toISOString() })
          .eq('id', editingShift.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shifts')
          .insert([{ ...shiftData, employee_id: user.id }]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingShift(null);
      loadShifts();
    } catch (error) {
      console.error('Error saving shift:', error);
      throw error;
    }
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setShowForm(true);
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

  const handleTakeOver = async (id: string) => {
    if (!user) return;

    try {
      const { data: shift } = await supabase
        .from('shifts')
        .select('employee_id')
        .eq('id', id)
        .single();

      if (!shift) throw new Error('Shift not found');

      const { error } = await supabase
        .from('shifts')
        .update({
          original_employee_id: shift.employee_id,
          employee_id: user.id,
          seeking_replacement: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      loadShifts();
    } catch (error) {
      console.error('Error taking over shift:', error);
      alert('Fehler beim Übernehmen der Vertretung');
    }
  };

  const handleSeekReplacement = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('shifts')
        .update({
          seeking_replacement: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      loadShifts();
    } catch (error) {
      console.error('Error seeking replacement:', error);
      alert('Fehler beim Suchen einer Vertretung');
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthName = currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Lädt...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Meine Termine</h2>
      </div>

      <div className="flex items-center justify-between">
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

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Termin hinzufügen
          </button>
        )}
      </div>

      {showForm && (
        <ShiftForm
          shift={editingShift}
          onSave={handleSaveShift}
          onCancel={() => {
            setShowForm(false);
            setEditingShift(null);
          }}
          onSeekReplacement={handleSeekReplacement}
        />
      )}

      <ShiftList
        shifts={shifts}
        onEdit={handleEditShift}
        onDelete={handleDeleteShift}
        onTakeOver={handleTakeOver}
        currentUserId={user?.id}
      />
    </div>
  );
}
