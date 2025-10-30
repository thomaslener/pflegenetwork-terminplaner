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
  region_name?: string;
};

export function MyShifts() {
  const { user } = useAuth();
  const [ownShifts, setOwnShifts] = useState<ShiftWithEmployee[]>([]);
  const [replacementShifts, setReplacementShifts] = useState<ShiftWithEmployee[]>([]);
  const [openShifts, setOpenShifts] = useState<ShiftWithEmployee[]>([]);
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

      const { data: ownShiftsData, error: ownError } = await supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', user.id)
        .gte('shift_date', startOfMonth.toISOString().split('T')[0])
        .lte('shift_date', endOfMonth.toISOString().split('T')[0])
        .order('shift_date')
        .order('time_from');

      if (ownError) throw ownError;

      const originalEmployeeIds = [...new Set(ownShiftsData?.filter(s => s.original_employee_id).map(s => s.original_employee_id) || [])];
      const { data: originalProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', originalEmployeeIds);

      const originalProfileMap = new Map(originalProfiles?.map(p => [p.id, p.full_name]) || []);

      // Load region names for own shifts
      const ownShiftRegionIds = [...new Set(ownShiftsData?.map(s => s.region_id).filter((id): id is string => !!id) || [])];

      let ownShiftRegions: { id: string; name: string }[] | null = [];

      if (ownShiftRegionIds.length > 0) {
        const { data: regionData } = await supabase
          .from('regions')
          .select('id, name')
          .in('id', ownShiftRegionIds);

        ownShiftRegions = regionData;
      }

      const ownShiftRegionMap = new Map(ownShiftRegions?.map(r => [r.id, r.name]) || []);

      const ownShiftsWithNames = ownShiftsData?.map(shift => ({
        ...shift,
        original_employee_name: shift.original_employee_id ? originalProfileMap.get(shift.original_employee_id) : undefined,
        region_name: shift.region_id ? ownShiftRegionMap.get(shift.region_id) : undefined
      })) || [];

      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('region_id')
        .eq('id', user.id)
        .single();

      let replacementShiftsWithNames: ShiftWithEmployee[] = [];
      let openShiftsWithNames: ShiftWithEmployee[] = [];

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

          if (employeeIdsInSameFederalState.length > 0) {
            const { data: replacementShiftsData, error: replacementError } = await supabase
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

            const { data: openShiftsData, error: openError } = await supabase
              .from('shifts')
              .select('*')
              .eq('open_shift', true)
              .is('employee_id', null)
              .in('region_id', regionIds)
              .gte('shift_date', startOfMonth.toISOString().split('T')[0])
              .lte('shift_date', endOfMonth.toISOString().split('T')[0])
              .order('shift_date')
              .order('time_from');

            if (openError) throw openError;

            const employeeIds = [...new Set([
              ...(replacementShiftsData?.map(s => s.employee_id) || []),
              ...(openShiftsData?.map(s => s.employee_id).filter((id): id is string => !!id) || [])
            ])];

            let profiles: { id: string; full_name: string | null; region_id: string | null }[] | null = [];

            if (employeeIds.length > 0) {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('id, full_name, region_id')
                .in('id', employeeIds);

              profiles = profileData;
            }

            const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
            const employeeRegionMap = new Map(profiles?.map(p => [p.id, p.region_id]) || []);

            // Load region names - include regions from employees and shifts
            const uniqueRegionIds = [...new Set([
              ...(replacementShiftsData?.map(s => s.region_id).filter((id): id is string => !!id) || []),
              ...(openShiftsData?.map(s => s.region_id).filter((id): id is string => !!id) || []),
              ...(profiles?.map(p => p.region_id).filter((id): id is string | null => !!id) || [])
            ])];

            let regions: { id: string; name: string }[] | null = [];

            if (uniqueRegionIds.length > 0) {
              const { data: regionData } = await supabase
                .from('regions')
                .select('id, name')
                .in('id', uniqueRegionIds);

              regions = regionData;
            }

            const regionMap = new Map(regions?.map(r => [r.id, r.name]) || []);

            replacementShiftsWithNames = replacementShiftsData?.map(shift => {
              const employeeRegionId = shift.employee_id ? employeeRegionMap.get(shift.employee_id) : null;
              const regionId = shift.region_id || employeeRegionId;
              return {
                ...shift,
                employee_name: profileMap.get(shift.employee_id) || 'Unbekannt',
                region_name: regionId ? regionMap.get(regionId) : undefined
              };
            }) || [];

            openShiftsWithNames = openShiftsData?.map(shift => ({
              ...shift,
              employee_name: shift.employee_id ? profileMap.get(shift.employee_id) || 'Unbekannt' : undefined,
              region_name: shift.region_id ? regionMap.get(shift.region_id) : undefined
            })) || [];
          }
        }
      }

      const sortByDateAndTime = (items: ShiftWithEmployee[]) =>
        [...items].sort((a, b) => {
          const dateCompare = a.shift_date.localeCompare(b.shift_date);
          if (dateCompare !== 0) return dateCompare;
          return a.time_from.localeCompare(b.time_from);
        });

      const now = new Date();
      const cutoffTimeOwnShifts = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const filteredOwnShifts = ownShiftsWithNames.filter(shift => {
        const shiftDateTime = new Date(`${shift.shift_date}T${shift.time_to}`);
        return shiftDateTime >= cutoffTimeOwnShifts;
      });

      const filteredReplacementShifts = replacementShiftsWithNames.filter(shift => {
        const shiftDate = new Date(`${shift.shift_date}T${shift.time_from}`);
        return shiftDate >= now;
      });

      const filteredOpenShifts = openShiftsWithNames.filter(shift => {
        const shiftDate = new Date(`${shift.shift_date}T${shift.time_from}`);
        return shiftDate >= now;
      });

      setOwnShifts(sortByDateAndTime(filteredOwnShifts));
      setReplacementShifts(sortByDateAndTime(filteredReplacementShifts));
      setOpenShifts(sortByDateAndTime(filteredOpenShifts));
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
        .select('employee_id, open_shift')
        .eq('id', id)
        .single();

      if (!shift) throw new Error('Shift not found');

      const updates: Partial<Shift> = {
        employee_id: user.id,
        seeking_replacement: false,
        open_shift: false,
        updated_at: new Date().toISOString(),
      };

      if (shift.open_shift) {
        updates.original_employee_id = null;
      } else if (shift.employee_id) {
        updates.original_employee_id = shift.employee_id;
      }

      const { error } = await supabase
        .from('shifts')
        .update(updates)
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
          open_shift: false,
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Meine Termine</h3>
              <p className="text-sm text-gray-500">Deine zugewiesenen Termine</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold px-3 py-1.5 rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Neu
            </button>
          </div>

          <ShiftList
            shifts={ownShifts}
            onEdit={handleEditShift}
            onDelete={handleDeleteShift}
            onTakeOver={handleTakeOver}
            currentUserId={user?.id}
            emptyMessage="Keine Termine vorhanden."
          />
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Vertretung gesucht</h3>
            <p className="text-sm text-gray-500">Termine aus deinem Bundesland</p>
          </div>

          {replacementShifts.length > 0 ? (
            <ShiftList
              shifts={replacementShifts}
              onEdit={() => {}}
              onDelete={() => {}}
              onTakeOver={handleTakeOver}
              currentUserId={user?.id}
              emptyMessage="Aktuell werden keine Vertretungen gesucht."
            />
          ) : (
            <div className="text-center py-10 text-gray-500 bg-white border border-slate-200 rounded-lg">
              Aktuell werden keine Vertretungen gesucht.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Offene Termine</h3>
            <p className="text-sm text-gray-500">Noch nicht besetzte Termine</p>
          </div>

          {openShifts.length > 0 ? (
            <ShiftList
              shifts={openShifts}
              onEdit={() => {}}
              onDelete={() => {}}
              onTakeOver={handleTakeOver}
              currentUserId={user?.id}
              emptyMessage="Aktuell gibt es keine offenen Termine."
            />
          ) : (
            <div className="text-center py-10 text-gray-500 bg-white border border-slate-200 rounded-lg">
              Aktuell gibt es keine offenen Termine.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
