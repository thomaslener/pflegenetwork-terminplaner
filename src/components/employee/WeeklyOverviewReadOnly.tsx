import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, ChevronRight, Calendar, X, Pencil, Trash2, AlertTriangle, Plus, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';
import { ClientAutocomplete } from '../shared/ClientAutocomplete';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Shift = Database['public']['Tables']['shifts']['Row'];
type Region = Database['public']['Tables']['regions']['Row'];

interface RegionExtended extends Region {
  federal_state_id: string | null;
  federal_state_sort_order?: number | null;
}

interface Absence {
  id: string;
  employee_id: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  reason: string;
}

interface EmployeeShifts {
  employee: Profile;
  shifts: Shift[];
  absences: Absence[];
}

interface RegionGroup {
  region: RegionExtended | null;
  employeeShifts: EmployeeShifts[];
  openShifts: Shift[];
}

// Color palette for regions
const REGION_COLORS = [
  'bg-blue-50 border-blue-200',
  'bg-green-50 border-green-200',
  'bg-purple-50 border-purple-200',
  'bg-orange-50 border-orange-200',
  'bg-pink-50 border-pink-200',
  'bg-cyan-50 border-cyan-200',
  'bg-amber-50 border-amber-200',
  'bg-teal-50 border-teal-200',
];

export function WeeklyOverviewReadOnly() {
  const { profile } = useAuth();
  const [regionGroups, setRegionGroups] = useState<RegionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFederalStateId, setUserFederalStateId] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    shift_date: '',
    time_from: '',
    time_to: '',
    client_name: '',
    notes: '',
  });
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    shift_date: '',
    time_from: '',
    time_to: '',
    client_name: '',
    notes: '',
  });
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  useEffect(() => {
    if (profile) {
      loadWeeklyData();
    }
  }, [currentWeekStart, profile]);

  const loadWeeklyData = async () => {
    setLoading(true);
    try {
      // Get the user's region to determine their federal state
      let currentUserFederalStateId: string | null = null;
      if (profile?.region_id) {
        const { data: userRegion } = await supabase
          .from('regions')
          .select('federal_state_id')
          .eq('id', profile.region_id)
          .maybeSingle();
        currentUserFederalStateId = userRegion?.federal_state_id || null;
        setUserFederalStateId(currentUserFederalStateId);
      }

      const [employeesRes, regionsRes, federalStatesRes, absencesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('region_id').order('sort_order'),
        supabase.from('regions').select('*').order('sort_order'),
        supabase.from('federal_states').select('id, sort_order').order('sort_order'),
        supabase.from('absences').select('*'),
      ]);

      if (employeesRes.error) throw employeesRes.error;
      if (regionsRes.error) throw regionsRes.error;
      if (federalStatesRes.error) throw federalStatesRes.error;
      if (absencesRes.error) throw absencesRes.error;

      let employees = employeesRes.data || [];
      let regions = (regionsRes.data || []) as RegionExtended[];
      const federalStates = federalStatesRes.data || [];
      const absences = absencesRes.data || [];

      // Add federal state sort order to regions
      const stateOrderMap = new Map(federalStates.map(fs => [fs.id, fs.sort_order]));
      regions = regions.map(r => ({
        ...r,
        federal_state_sort_order: r.federal_state_id ? stateOrderMap.get(r.federal_state_id) : null
      }));

      // Filter regions and employees to only show those in the user's federal state
      if (currentUserFederalStateId) {
        regions = regions.filter(r => r.federal_state_id === currentUserFederalStateId);
        const regionIds = new Set(regions.map(r => r.id));
        employees = employees.filter(e => e.region_id && regionIds.has(e.region_id));
      }

      // Sort regions by federal state order, then by region order
      regions.sort((a, b) => {
        const stateOrderA = a.federal_state_sort_order ?? 999999;
        const stateOrderB = b.federal_state_sort_order ?? 999999;
        if (stateOrderA !== stateOrderB) {
          return stateOrderA - stateOrderB;
        }
        return (a.sort_order ?? 999999) - (b.sort_order ?? 999999);
      });

      const weekEnd = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + 6);

      const startYear = currentWeekStart.getFullYear();
      const startMonth = String(currentWeekStart.getMonth() + 1).padStart(2, '0');
      const startDay = String(currentWeekStart.getDate()).padStart(2, '0');
      const startDateStr = `${startYear}-${startMonth}-${startDay}`;

      const endYear = weekEnd.getFullYear();
      const endMonth = String(weekEnd.getMonth() + 1).padStart(2, '0');
      const endDay = String(weekEnd.getDate()).padStart(2, '0');
      const endDateStr = `${endYear}-${endMonth}-${endDay}`;

      // Get employee IDs from the filtered employees (same federal state only)
      const filteredEmployeeIds = new Set(employees.map(e => e.id));

      const { data: allShifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .not('employee_id', 'is', null)
        .gte('shift_date', startDateStr)
        .lte('shift_date', endDateStr)
        .order('shift_date')
        .order('time_from');

      if (shiftsError) throw shiftsError;

      // Get open shifts for regions in this federal state
      const regionIds = regions.map(r => r.id);
      const { data: openShifts, error: openShiftsError } = await supabase
        .from('shifts')
        .select('*')
        .is('employee_id', null)
        .eq('open_shift', true)
        .in('region_id', regionIds)
        .gte('shift_date', startDateStr)
        .lte('shift_date', endDateStr)
        .order('shift_date')
        .order('time_from');

      if (openShiftsError) throw openShiftsError;

      // Filter shifts to only include those from employees in the same federal state
      const filteredShifts = (allShifts || []).filter(shift =>
        shift.employee_id && filteredEmployeeIds.has(shift.employee_id)
      );

      const employeeShiftsData: EmployeeShifts[] = employees.map(employee => ({
        employee,
        shifts: filteredShifts.filter(shift => shift.employee_id === employee.id),
        absences: absences.filter(absence => absence.employee_id === employee.id),
      }));

      const groupedByRegion: RegionGroup[] = [];

      regions.forEach(region => {
        const regionEmployees = employeeShiftsData.filter(
          es => es.employee.region_id === region.id
        );
        const regionOpenShifts = (openShifts || []).filter(
          s => s.region_id === region.id
        );
        if (regionEmployees.length > 0 || regionOpenShifts.length > 0) {
          groupedByRegion.push({
            region,
            employeeShifts: regionEmployees,
            openShifts: regionOpenShifts,
          });
        }
      });

      const noRegionEmployees = employeeShiftsData.filter(
        es => !es.employee.region_id
      );
      if (noRegionEmployees.length > 0) {
        groupedByRegion.push({
          region: null,
          employeeShifts: noRegionEmployees,
          openShifts: [],
        });
      }

      setRegionGroups(groupedByRegion);
    } catch (error) {
      console.error('Error loading weekly data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkTimeOverlap = (shift1TimeFrom: string, shift1TimeTo: string, shift2TimeFrom: string, shift2TimeTo: string): boolean => {
    return (shift1TimeFrom < shift2TimeTo && shift1TimeTo > shift2TimeFrom);
  };

  const previousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const currentWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getShiftsForDay = (employeeShifts: EmployeeShifts[], employeeId: string, date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const employee = employeeShifts.find(es => es.employee.id === employeeId);
    if (!employee) return [];
    return employee.shifts.filter(shift => shift.shift_date === dateStr);
  };

  const getAbsencesForDay = (employeeShifts: EmployeeShifts[], employeeId: string, date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const employee = employeeShifts.find(es => es.employee.id === employeeId);
    if (!employee) return [];
    return employee.absences.filter(absence =>
      absence.start_date <= dateStr && absence.end_date >= dateStr
    );
  };

  const isOwnShift = (shift: Shift) => {
    return shift.employee_id === profile?.id;
  };

  const handleShiftClick = (shift: Shift) => {
    if (!isOwnShift(shift)) return;

    setSelectedShift(shift);
    setEditForm({
      shift_date: shift.shift_date,
      time_from: shift.time_from,
      time_to: shift.time_to,
      client_name: shift.client_name,
      notes: shift.notes || '',
    });
    setEditMode(false);
    setErrorMessage(null);
  };

  const handleCreateClick = (date: Date) => {
    if (!profile) return;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    setCreateForm({
      shift_date: dateStr,
      time_from: '',
      time_to: '',
      client_name: '',
      notes: '',
    });
    setShowCreateModal(true);
    setErrorMessage(null);
  };

  const handleCreateShift = async () => {
    if (!profile || !createForm.shift_date || !createForm.time_from || !createForm.time_to || !createForm.client_name) {
      setErrorMessage('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    try {
      const { data: existingShifts, error: queryError } = await supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', profile.id)
        .eq('shift_date', createForm.shift_date);

      if (queryError) throw queryError;

      if (existingShifts && existingShifts.length > 0) {
        for (const existing of existingShifts) {
          if (checkTimeOverlap(createForm.time_from, createForm.time_to, existing.time_from, existing.time_to)) {
            setErrorMessage('Der Termin überschneidet sich mit einem bestehenden Termin an diesem Tag.');
            return;
          }
        }
      }

      const { error } = await supabase
        .from('shifts')
        .insert({
          employee_id: profile.id,
          shift_date: createForm.shift_date,
          time_from: createForm.time_from,
          time_to: createForm.time_to,
          client_name: createForm.client_name,
          notes: createForm.notes,
        });

      if (error) throw error;

      setShowCreateModal(false);
      setErrorMessage(null);
      loadWeeklyData();
    } catch (error) {
      console.error('Error creating shift:', error);
      alert('Fehler beim Erstellen des Termins');
    }
  };

  const handleEditShift = async () => {
    if (!selectedShift || !profile) return;

    try {
      const { data: existingShifts, error: queryError } = await supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', profile.id)
        .eq('shift_date', editForm.shift_date)
        .neq('id', selectedShift.id);

      if (queryError) throw queryError;

      if (existingShifts && existingShifts.length > 0) {
        for (const existing of existingShifts) {
          if (checkTimeOverlap(editForm.time_from, editForm.time_to, existing.time_from, existing.time_to)) {
            setErrorMessage('Der Termin überschneidet sich mit einem bestehenden Termin an diesem Tag.');
            return;
          }
        }
      }

      const { error } = await supabase
        .from('shifts')
        .update({
          shift_date: editForm.shift_date,
          time_from: editForm.time_from,
          time_to: editForm.time_to,
          client_name: editForm.client_name,
          notes: editForm.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedShift.id);

      if (error) throw error;

      setSelectedShift(null);
      setEditMode(false);
      setErrorMessage(null);
      loadWeeklyData();
    } catch (error) {
      console.error('Error updating shift:', error);
      alert('Fehler beim Aktualisieren des Termins');
    }
  };

  const handleToggleSeekingReplacement = async () => {
    if (!selectedShift) return;

    try {
      const { error } = await supabase
        .from('shifts')
        .update({
          seeking_replacement: !selectedShift.seeking_replacement,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedShift.id);

      if (error) throw error;

      setSelectedShift(null);
      setErrorMessage(null);
      loadWeeklyData();
    } catch (error) {
      console.error('Error toggling seeking replacement:', error);
      alert('Fehler beim Ändern der Vertretungssuche');
    }
  };

  const handleDeleteShift = async () => {
    if (!selectedShift) return;
    if (!confirm('Möchten Sie diesen Termin wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', selectedShift.id);

      if (error) throw error;

      setSelectedShift(null);
      setErrorMessage(null);
      loadWeeklyData();
    } catch (error) {
      console.error('Error deleting shift:', error);
      alert('Fehler beim Löschen des Termins');
    }
  };

  const handleDragStart = (shift: Shift) => {
    if (!isOwnShift(shift)) return;
    setDraggedShift(shift);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleTakeOver = async (shiftId: string) => {
    if (!profile) return;

    try {
      const { data: shift } = await supabase
        .from('shifts')
        .select('employee_id, open_shift')
        .eq('id', shiftId)
        .single();

      if (!shift) throw new Error('Shift not found');

      const updates: any = {
        employee_id: profile.id,
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
        .eq('id', shiftId);

      if (error) throw error;

      loadWeeklyData();
    } catch (error) {
      console.error('Error taking over shift:', error);
      alert('Fehler beim Übernehmen der Vertretung');
    }
  };

  const handleDrop = async (employeeId: string, date: Date) => {
    if (!draggedShift || !profile) return;
    if (employeeId !== profile.id) {
      setDraggedShift(null);
      return;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const newDateStr = `${year}-${month}-${day}`;

    if (draggedShift.shift_date === newDateStr && draggedShift.employee_id === employeeId) {
      setDraggedShift(null);
      return;
    }

    try {
      setErrorMessage(null);

      const { data: existingShifts, error: queryError } = await supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('shift_date', newDateStr)
        .neq('id', draggedShift.id);

      if (queryError) throw queryError;

      if (existingShifts && existingShifts.length > 0) {
        for (const existing of existingShifts) {
          if (checkTimeOverlap(draggedShift.time_from, draggedShift.time_to, existing.time_from, existing.time_to)) {
            setErrorMessage('Der Termin überschneidet sich mit einem bestehenden Termin an diesem Tag.');
            setDraggedShift(null);
            return;
          }
        }
      }

      const { error } = await supabase
        .from('shifts')
        .update({
          employee_id: employeeId,
          shift_date: newDateStr,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draggedShift.id);

      if (error) throw error;

      setDraggedShift(null);
      loadWeeklyData();
    } catch (error) {
      console.error('Error moving shift:', error);
      alert('Fehler beim Verschieben des Termins');
      setDraggedShift(null);
    }
  };

  const weekDays = getWeekDays();
  const weekEnd = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + 6);

  const weekRange = `${currentWeekStart.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Lädt...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Wochenübersicht</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={previousWeek}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Vorherige Woche"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={currentWeek}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Aktuelle Woche"
          >
            <Calendar className="w-5 h-5" />
          </button>
          <div className="px-4 py-2 border border-gray-300 rounded-lg bg-white min-w-[200px] text-center">
            <span className="font-medium text-gray-900">{weekRange}</span>
          </div>
          <button
            onClick={nextWeek}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Nächste Woche"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
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

      {regionGroups.map((group, groupIndex) => {
        const regionColor = REGION_COLORS[groupIndex % REGION_COLORS.length];
        return (
        <div key={groupIndex} className="space-y-3">
          <div className={`px-4 py-2 rounded-lg border-2 ${regionColor}`}>
            <h3 className="text-lg font-semibold text-gray-900">
              {group.region ? group.region.name : 'Keine Region'}
            </h3>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 min-w-[180px]">
                    Person
                  </th>
                  {weekDays.map((day, index) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    return (
                      <th
                        key={index}
                        className={`px-3 py-3 text-center text-xs font-medium uppercase tracking-wider min-w-[140px] ${
                          isToday ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                        }`}
                      >
                        <div>{day.toLocaleDateString('de-DE', { weekday: 'short' })}</div>
                        <div className="text-sm">{day.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {group.employeeShifts.map((es) => {
                  const totalHours = es.shifts.reduce((sum, shift) => {
                    const [fromHour, fromMin] = shift.time_from.split(':').map(Number);
                    const [toHour, toMin] = shift.time_to.split(':').map(Number);
                    const hours = (toHour * 60 + toMin - (fromHour * 60 + fromMin)) / 60;
                    return sum + hours;
                  }, 0);

                  return (
                  <tr key={es.employee.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-slate-200">
                      <div>
                        <div className="font-medium">{es.employee.full_name || 'Unbenannt'}</div>
                        <div className="text-xs text-gray-600">{totalHours.toFixed(1)}h</div>
                      </div>
                    </td>
                    {weekDays.map((day, dayIndex) => {
                      const shifts = getShiftsForDay(group.employeeShifts, es.employee.id, day);
                      const absences = getAbsencesForDay(group.employeeShifts, es.employee.id, day);
                      const isToday = day.toDateString() === new Date().toDateString();
                      return (
                        <td
                          key={dayIndex}
                          className={`px-3 py-3 text-xs ${
                            isToday ? 'bg-primary-50' : ''
                          }`}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(es.employee.id, day)}
                        >
                          {absences.length === 0 && shifts.length === 0 ? (
                            es.employee.id === profile?.id ? (
                              <div className="flex items-center justify-center">
                                <button
                                  onClick={() => handleCreateClick(day)}
                                  className="text-gray-400 hover:text-primary-600 hover:bg-primary-50 p-2 rounded transition-colors"
                                  title="Termin hinzufügen"
                                >
                                  <Plus className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <div className="text-center text-gray-400">-</div>
                            )
                          ) : (
                            <div className="space-y-1">
                              {absences.map((absence) => {
                                const isSingleDay = absence.start_date === absence.end_date;
                                const isFullDay = absence.start_time === '00:00:00' && absence.end_time === '23:59:59';
                                const showTime = isSingleDay && !isFullDay;

                                return (
                                  <div
                                    key={absence.id}
                                    className="rounded px-2 py-1.5 bg-orange-100 border border-orange-200"
                                  >
                                    <div className="font-semibold text-orange-900 truncate">
                                      Abwesend
                                    </div>
                                    {showTime && (
                                      <div className="text-orange-700 text-xs mt-0.5">
                                        {absence.start_time.substring(0, 5)} - {absence.end_time.substring(0, 5)}
                                      </div>
                                    )}
                                    {absence.reason && (
                                      <div className="text-orange-700 text-xs mt-0.5 truncate" title={absence.reason}>
                                        {absence.reason}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {shifts.map((shift) => {
                                const isOwn = isOwnShift(shift);
                                const isSeekingReplacement = shift.seeking_replacement && !isOwn;
                                const isOwnSeekingReplacement = shift.seeking_replacement && isOwn;
                                const isReplacementShift = shift.original_employee_id && isOwn;
                                const originalEmployeeName = isReplacementShift
                                  ? group.employeeShifts.find(es => es.employee.id === shift.original_employee_id)?.employee.full_name
                                  : null;
                                // Check if shift owner is in same federal state
                                const shiftOwnerRegion = group.employeeShifts.find(es => es.employee.id === shift.employee_id)?.employee.region_id;
                                const shiftOwnerInSameFederalState = shiftOwnerRegion && group.region?.federal_state_id === userFederalStateId;
                                const canTakeOver = isSeekingReplacement && shiftOwnerInSameFederalState;
                                return (
                                  <div key={shift.id}>
                                    <div
                                      draggable={isOwn}
                                      onDragStart={() => handleDragStart(shift)}
                                      onClick={() => !isSeekingReplacement && handleShiftClick(shift)}
                                      className={`rounded px-2 py-1.5 ${
                                        isSeekingReplacement
                                          ? 'bg-yellow-50 border-2 border-yellow-400 border-dashed opacity-60'
                                          : isOwn
                                          ? 'bg-blue-100 border border-blue-200 cursor-pointer hover:bg-blue-200'
                                          : 'bg-gray-100 border border-gray-200'
                                      }`}
                                    >
                                      <div className={`font-semibold truncate ${
                                        isSeekingReplacement ? 'text-yellow-900' : isOwn ? 'text-blue-900' : 'text-gray-700'
                                      }`}>
                                        {shift.client_name}
                                      </div>
                                      <div className={`mt-0.5 ${
                                        isSeekingReplacement ? 'text-yellow-700' : isOwn ? 'text-primary-700' : 'text-gray-600'
                                      }`}>
                                        {shift.time_from.substring(0, 5)} - {shift.time_to.substring(0, 5)}
                                      </div>
                                      {shift.notes && (
                                        <div className={`text-xs mt-0.5 truncate ${
                                          isSeekingReplacement ? 'text-yellow-600' : isOwn ? 'text-primary-600' : 'text-gray-500'
                                        }`} title={shift.notes}>
                                          {shift.notes}
                                        </div>
                                      )}
                                      {isOwnSeekingReplacement && (
                                        <div className="text-xs mt-1 font-semibold text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                                          Vertretung wird gesucht
                                        </div>
                                      )}
                                      {isReplacementShift && originalEmployeeName && (
                                        <div className="text-xs mt-1 font-semibold text-primary-700 bg-primary-50 px-2 py-1 rounded">
                                          In Vertretung für {originalEmployeeName}
                                        </div>
                                      )}
                                      {isOwn && (
                                        <button
                                          onClick={() => {}}
                                          className="flex items-center gap-1 mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-semibold py-0.5 px-1.5 rounded transition-colors uppercase"
                                          title="Buchung"
                                        >
                                          <FileText className="w-2.5 h-2.5" />
                                          Buchung
                                        </button>
                                      )}
                                    </div>
                                    {canTakeOver && (
                                      <button
                                        onClick={() => handleTakeOver(shift.id)}
                                        className="w-full mt-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 px-2 rounded transition-colors"
                                      >
                                        Vertretung übernehmen?
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                              {es.employee.id === profile?.id && (
                                <div className="flex items-center justify-center pt-1">
                                  <button
                                    onClick={() => handleCreateClick(day)}
                                    className="text-gray-400 hover:text-primary-600 hover:bg-primary-50 p-1 rounded transition-colors"
                                    title="Termin hinzufügen"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  );
                })}
                {group.openShifts.length > 0 && (
                  <tr className="bg-amber-50 border-t-2 border-amber-300">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-amber-900 sticky left-0 bg-amber-50 z-10 border-r border-slate-200">
                      Offene Termine
                    </td>
                    {weekDays.map((day, dayIndex) => {
                      const year = day.getFullYear();
                      const month = String(day.getMonth() + 1).padStart(2, '0');
                      const dayStr = String(day.getDate()).padStart(2, '0');
                      const dateStr = `${year}-${month}-${dayStr}`;
                      const openShiftsForDay = group.openShifts.filter(shift => shift.shift_date === dateStr);
                      const isToday = day.toDateString() === new Date().toDateString();
                      return (
                        <td
                          key={dayIndex}
                          className={`px-3 py-3 text-xs ${
                            isToday ? 'bg-amber-100' : 'bg-amber-50'
                          }`}
                        >
                          <div className="min-h-[60px]">
                            {openShiftsForDay.length > 0 && (
                              <div className="space-y-1">
                                {openShiftsForDay.map((shift) => (
                                  <div
                                    key={shift.id}
                                    className="w-full bg-amber-100 border-2 border-amber-400 rounded px-2 py-1.5 transition-colors text-left"
                                  >
                                    <div className="font-semibold text-amber-900 truncate">
                                      {shift.client_name}
                                    </div>
                                    <div className="text-amber-800 mt-0.5">
                                      {shift.time_from.substring(0, 5)} - {shift.time_to.substring(0, 5)}
                                    </div>
                                    {shift.notes && (
                                      <div className="text-xs text-amber-700 mt-0.5 truncate" title={shift.notes}>
                                        {shift.notes}
                                      </div>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTakeOver(shift.id);
                                      }}
                                      className="w-full mt-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-1.5 px-2 rounded transition-colors"
                                    >
                                      Termin übernehmen
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
      })}

      {regionGroups.length === 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-gray-500">
          Keine Personen vorhanden.
        </div>
      )}

      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h3 className="font-semibold text-gray-900 mb-2">Statistik</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Person</div>
            <div className="text-2xl font-bold text-gray-900">
              {regionGroups.reduce((sum, group) => sum + group.employeeShifts.length, 0)}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Gesamt Termine</div>
            <div className="text-2xl font-bold text-gray-900">
              {regionGroups.reduce((sum, group) =>
                sum + group.employeeShifts.reduce((s, es) => s + es.shifts.length, 0), 0
              )}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Ø Termine/MA</div>
            <div className="text-2xl font-bold text-gray-900">
              {(() => {
                const totalEmployees = regionGroups.reduce((sum, group) => sum + group.employeeShifts.length, 0);
                const totalShifts = regionGroups.reduce((sum, group) =>
                  sum + group.employeeShifts.reduce((s, es) => s + es.shifts.length, 0), 0
                );
                return totalEmployees > 0 ? (totalShifts / totalEmployees).toFixed(1) : '0';
              })()}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Personen mit Terminen</div>
            <div className="text-2xl font-bold text-gray-900">
              {regionGroups.reduce((sum, group) =>
                sum + group.employeeShifts.filter(es => es.shifts.length > 0).length, 0
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editMode ? 'Termin bearbeiten' : 'Termin Details'}
              </h3>
              <button
                onClick={() => {
                  setSelectedShift(null);
                  setEditMode(false);
                  setErrorMessage(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-800 font-medium">Fehler</p>
                    <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
                  </div>
                </div>
              )}

              {!editMode ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Datum</label>
                      <p className="mt-1 text-gray-900">
                        {new Date(selectedShift.shift_date).toLocaleDateString('de-DE', {
                          weekday: 'long',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Zeit</label>
                      <p className="mt-1 text-gray-900">
                        {selectedShift.time_from.substring(0, 5)} - {selectedShift.time_to.substring(0, 5)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Klient</label>
                    <p className="mt-1 text-gray-900">{selectedShift.client_name}</p>
                  </div>

                  {selectedShift.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Notizen</label>
                      <p className="mt-1 text-gray-900 whitespace-pre-wrap">{selectedShift.notes}</p>
                    </div>
                  )}

                  <div className="space-y-3 pt-4">
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setEditMode(true);
                          setErrorMessage(null);
                        }}
                        className="flex items-center gap-2 flex-1 justify-center bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                        Bearbeiten
                      </button>
                      <button
                        onClick={handleDeleteShift}
                        className="flex items-center gap-2 flex-1 justify-center bg-red-600 hover:bg-red-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Löschen
                      </button>
                    </div>
                    <button
                      onClick={handleToggleSeekingReplacement}
                      className={`w-full px-4 py-2 rounded-lg transition-colors font-medium ${
                        selectedShift.seeking_replacement
                          ? 'bg-gray-600 hover:bg-gray-700 text-[#2e2e2e] font-bold'
                          : 'bg-yellow-600 hover:bg-yellow-700 text-[#2e2e2e] font-bold'
                      }`}
                    >
                      {selectedShift.seeking_replacement
                        ? 'Suche nach Vertretung beenden'
                        : 'Vertretung finden'
                      }
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Datum *
                      </label>
                      <input
                        type="date"
                        value={editForm.shift_date}
                        onChange={(e) => setEditForm({ ...editForm, shift_date: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Klient *
                      </label>
                      <ClientAutocomplete
                        value={editForm.client_name}
                        onChange={(value) => setEditForm({ ...editForm, client_name: value })}
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
                        value={editForm.time_from}
                        onChange={(e) => setEditForm({ ...editForm, time_from: e.target.value })}
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
                        value={editForm.time_to}
                        onChange={(e) => setEditForm({ ...editForm, time_to: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notizen
                    </label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      rows={3}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setEditForm({
                          shift_date: selectedShift.shift_date,
                          time_from: selectedShift.time_from,
                          time_to: selectedShift.time_to,
                          client_name: selectedShift.client_name,
                          notes: selectedShift.notes || '',
                        });
                        setErrorMessage(null);
                      }}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold px-4 py-2 rounded-lg transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleEditShift}
                      className="flex-1 bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors"
                    >
                      Speichern
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                Neuer Termin
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setErrorMessage(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
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
                    Datum *
                  </label>
                  <input
                    type="date"
                    value={createForm.shift_date}
                    onChange={(e) => setCreateForm({ ...createForm, shift_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Klient *
                  </label>
                  <ClientAutocomplete
                    value={createForm.client_name}
                    onChange={(value) => setCreateForm({ ...createForm, client_name: value })}
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
                    value={createForm.time_from}
                    onChange={(e) => setCreateForm({ ...createForm, time_from: e.target.value })}
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
                    value={createForm.time_to}
                    onChange={(e) => setCreateForm({ ...createForm, time_to: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notizen
                </label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  placeholder="Optional"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setErrorMessage(null);
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleCreateShift}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Erstellen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
