import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, ChevronRight, Calendar, X, Pencil, Trash2, AlertTriangle, Plus, FileText } from 'lucide-react';
import type { Database } from '../../lib/database.types';
import { ClientAutocomplete } from '../shared/ClientAutocomplete';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Shift = Database['public']['Tables']['shifts']['Row'];
type Region = Database['public']['Tables']['regions']['Row'];

interface RegionExtended extends Region {
  federal_state_id: string | null;
  federal_state_sort_order?: number | null;
}

interface FederalState {
  id: string;
  name: string;
  sort_order: number | null;
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

interface FederalStateGroup {
  federalState: FederalState | null;
  regionGroups: RegionGroup[];
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

export function WeeklyOverview() {
  const [federalStateGroups, setFederalStateGroups] = useState<FederalStateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [allAbsences, setAllAbsences] = useState<Absence[]>([]);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    employee_id: '',
    shift_date: '',
    time_from: '',
    time_to: '',
    client_name: '',
    notes: '',
  });
  const [allEmployees, setAllEmployees] = useState<Profile[]>([]);
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    employee_id: '',
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
    loadWeeklyData();
  }, [currentWeekStart]);

  const loadWeeklyData = async () => {
    setLoading(true);
    try {
      const [employeesRes, districtsRes, federalStatesRes, absencesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('region_id').order('sort_order'),
        supabase.from('districts').select('*').order('sort_order'),
        supabase.from('regions').select('*').order('sort_order'),
        supabase.from('absences').select('*'),
      ]);

      if (employeesRes.error) throw employeesRes.error;
      if (districtsRes.error) throw districtsRes.error;
      if (federalStatesRes.error) throw federalStatesRes.error;
      if (absencesRes.error) throw absencesRes.error;

      const employees = employeesRes.data || [];
      let districts = (districtsRes.data || []) as RegionExtended[];
      const federalStates = (federalStatesRes.data || []) as FederalState[];
      const absences = absencesRes.data || [];

      console.log('WeeklyOverview loaded:', { employees, districts, federalStates });

      // Add federal state sort order to districts
      const stateOrderMap = new Map(federalStates.map(fs => [fs.id, fs.sort_order]));
      districts = districts.map(r => ({
        ...r,
        federal_state_sort_order: r.federal_state_id ? stateOrderMap.get(r.federal_state_id) : null
      }));

      // Sort districts by federal state order, then by district order
      districts.sort((a, b) => {
        const stateOrderA = a.federal_state_sort_order ?? 999999;
        const stateOrderB = b.federal_state_sort_order ?? 999999;
        if (stateOrderA !== stateOrderB) {
          return stateOrderA - stateOrderB;
        }
        return (a.sort_order ?? 999999) - (b.sort_order ?? 999999);
      });

      setAllAbsences(absences);

      setAllEmployees(employees);

      const weekEnd = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + 6);

      const startYear = currentWeekStart.getFullYear();
      const startMonth = String(currentWeekStart.getMonth() + 1).padStart(2, '0');
      const startDay = String(currentWeekStart.getDate()).padStart(2, '0');
      const startDateStr = `${startYear}-${startMonth}-${startDay}`;

      const endYear = weekEnd.getFullYear();
      const endMonth = String(weekEnd.getMonth() + 1).padStart(2, '0');
      const endDay = String(weekEnd.getDate()).padStart(2, '0');
      const endDateStr = `${endYear}-${endMonth}-${endDay}`;

      const { data: allShifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .not('employee_id', 'is', null)
        .gte('shift_date', startDateStr)
        .lte('shift_date', endDateStr)
        .order('shift_date')
        .order('time_from');

      if (shiftsError) throw shiftsError;

      const { data: openShifts, error: openShiftsError } = await supabase
        .from('shifts')
        .select('*')
        .is('employee_id', null)
        .eq('open_shift', true)
        .gte('shift_date', startDateStr)
        .lte('shift_date', endDateStr)
        .order('shift_date')
        .order('time_from');

      if (openShiftsError) throw openShiftsError;

      const employeeShiftsData: EmployeeShifts[] = employees.map(employee => ({
        employee,
        shifts: (allShifts || []).filter(shift => shift.employee_id === employee.id),
        absences: absences.filter(absence => absence.employee_id === employee.id),
      }));

      console.log('employeeShiftsData:', employeeShiftsData);

      const groupedByDistrict: RegionGroup[] = [];

      // Group by district in the sorted order
      districts.forEach(district => {
        const districtEmployees = employeeShiftsData.filter(
          es => es.employee.region_id === district.id
        );
        const districtOpenShifts = (openShifts || []).filter(
          s => s.region_id === district.id
        );
        console.log(`District ${district.name}:`, { districtEmployees, districtOpenShifts });
        // Always show district if it has employees, even without shifts
        if (districtEmployees.length > 0 || districtOpenShifts.length > 0) {
          groupedByDistrict.push({
            region: district,
            employeeShifts: districtEmployees,
            openShifts: districtOpenShifts,
          });
        }
      });

      const noDistrictEmployees = employeeShiftsData.filter(
        es => !es.employee.region_id
      );
      if (noDistrictEmployees.length > 0) {
        groupedByDistrict.push({
          region: null,
          employeeShifts: noDistrictEmployees,
          openShifts: [],
        });
      }

      // Group districts by federal state
      const groupedByFederalState: FederalStateGroup[] = [];

      federalStates.forEach(state => {
        const stateDistricts = groupedByDistrict.filter(
          rg => rg.region?.federal_state_id === state.id
        );
        if (stateDistricts.length > 0) {
          groupedByFederalState.push({
            federalState: state,
            regionGroups: stateDistricts,
          });
        }
      });

      // Add districts without federal state
      const noStateDistricts = groupedByDistrict.filter(
        rg => !rg.region || !rg.region.federal_state_id
      );
      if (noStateDistricts.length > 0) {
        groupedByFederalState.push({
          federalState: null,
          regionGroups: noStateDistricts,
        });
      }

      setFederalStateGroups(groupedByFederalState);
    } catch (error) {
      console.error('Error loading weekly data:', error);
    } finally {
      setLoading(false);
    }
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

  const handleShiftClick = (shift: Shift) => {
    setSelectedShift(shift);
    setEditForm({
      employee_id: shift.employee_id || '',
      shift_date: shift.shift_date,
      time_from: shift.time_from,
      time_to: shift.time_to,
      client_name: shift.client_name,
      notes: shift.notes || '',
    });
    setEditMode(false);
  };

  const handleCreateClick = (employeeId: string, date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    setCreateForm({
      employee_id: employeeId,
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
    if (!createForm.employee_id || !createForm.shift_date || !createForm.time_from || !createForm.time_to || !createForm.client_name) {
      setErrorMessage('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    try {
      const { data: existingShifts, error: queryError } = await supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', createForm.employee_id)
        .eq('shift_date', createForm.shift_date);

      if (queryError) throw queryError;

      if (existingShifts && existingShifts.length > 0) {
        for (const existing of existingShifts) {
          if (checkTimeOverlap(createForm.time_from, createForm.time_to, existing.time_from, existing.time_to)) {
            setErrorMessage('Der Termin überschneidet sich mit einem bestehenden Termin der Person an diesem Tag.');
            return;
          }
        }
      }

      const { error } = await supabase
        .from('shifts')
        .insert({
          employee_id: createForm.employee_id,
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
    if (!selectedShift) return;

    try {
      const { data: existingShifts, error: queryError } = await supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', editForm.employee_id)
        .eq('shift_date', editForm.shift_date)
        .neq('id', selectedShift.id);

      if (queryError) throw queryError;

      if (existingShifts && existingShifts.length > 0) {
        for (const existing of existingShifts) {
          if (checkTimeOverlap(editForm.time_from, editForm.time_to, existing.time_from, existing.time_to)) {
            setErrorMessage('Der Termin überschneidet sich mit einem bestehenden Termin der Person an diesem Tag.');
            return;
          }
        }
      }

      const { error } = await supabase
        .from('shifts')
        .update({
          employee_id: editForm.employee_id,
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
      loadWeeklyData();
    } catch (error) {
      console.error('Error updating shift:', error);
      alert('Fehler beim Aktualisieren des Termins');
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
      loadWeeklyData();
    } catch (error) {
      console.error('Error deleting shift:', error);
      alert('Fehler beim Löschen des Termins');
    }
  };

  const getAllRegionGroups = () => {
    return federalStateGroups.flatMap(stateGroup => stateGroup.regionGroups);
  };

  const getEmployeeName = (employeeId: string) => {
    const regionGroups = getAllRegionGroups();
    for (const group of regionGroups) {
      const employeeData = group.employeeShifts.find(es => es.employee.id === employeeId);
      if (employeeData) {
        return employeeData.employee.full_name || 'Unbekannt';
      }
    }
    return 'Unbekannt';
  };

  const handleDragStart = (shift: Shift, e: React.DragEvent) => {
    setDraggedShift(shift);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const checkTimeOverlap = (shift1TimeFrom: string, shift1TimeTo: string, shift2TimeFrom: string, shift2TimeTo: string): boolean => {
    const start1 = shift1TimeFrom;
    const end1 = shift1TimeTo;
    const start2 = shift2TimeFrom;
    const end2 = shift2TimeTo;

    return (start1 < end2 && end1 > start2);
  };

  const handleDrop = async (employeeId: string, date: Date, e: React.DragEvent) => {
    e.preventDefault();

    if (!draggedShift) return;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    if (draggedShift.employee_id === employeeId && draggedShift.shift_date === dateStr) {
      setDraggedShift(null);
      return;
    }

    try {
      const { data: existingShifts, error: queryError } = await supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('shift_date', dateStr)
        .neq('id', draggedShift.id);

      if (queryError) throw queryError;

      if (existingShifts && existingShifts.length > 0) {
        for (const existing of existingShifts) {
          if (checkTimeOverlap(draggedShift.time_from, draggedShift.time_to, existing.time_from, existing.time_to)) {
            setErrorMessage('Der Termin überschneidet sich mit einem bestehenden Termin der Person an diesem Tag.');
            setDraggedShift(null);
            return;
          }
        }
      }

      const { error } = await supabase
        .from('shifts')
        .update({
          employee_id: employeeId,
          shift_date: dateStr,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draggedShift.id);

      if (error) throw error;

      setDraggedShift(null);
      loadWeeklyData();
    } catch (error) {
      console.error('Error moving shift:', error);
      alert('Fehler beim Verschieben des Termins');
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

      {federalStateGroups.map((stateGroup, stateIndex) => {
        const stateTotalHours = stateGroup.regionGroups.reduce((stateSum, group) =>
          stateSum + group.employeeShifts.reduce((groupSum, es) =>
            groupSum + es.shifts.reduce((shiftSum, shift) => {
              const [fromHour, fromMin] = shift.time_from.split(':').map(Number);
              const [toHour, toMin] = shift.time_to.split(':').map(Number);
              const hours = (toHour * 60 + toMin - (fromHour * 60 + fromMin)) / 60;
              return shiftSum + hours;
            }, 0), 0), 0);

        return (
        <div key={stateIndex} className="space-y-4">
          {stateGroup.federalState && (
            <div className="bg-gradient-to-r from-gray-700 to-gray-600 px-6 py-3 rounded-lg shadow-md">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">
                  {stateGroup.federalState.name}
                </h2>
                <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-semibold">
                  {stateTotalHours.toFixed(1)}h
                </span>
              </div>
            </div>
          )}

          {stateGroup.regionGroups.map((group, groupIndex) => {
            const regionColor = REGION_COLORS[(stateIndex * 10 + groupIndex) % REGION_COLORS.length];
            return (
            <div key={groupIndex} className="space-y-3 ml-4">
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
                      const year = day.getFullYear();
                      const month = String(day.getMonth() + 1).padStart(2, '0');
                      const dayStr = String(day.getDate()).padStart(2, '0');
                      const dateStr = `${year}-${month}-${dayStr}`;
                      const isDragOver = draggedShift && (draggedShift.employee_id !== es.employee.id || draggedShift.shift_date !== dateStr);
                      return (
                        <td
                          key={dayIndex}
                          className={`px-3 py-3 text-xs ${
                            isToday ? 'bg-primary-50' : ''
                          }`}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(es.employee.id, day, e)}
                        >
                          <div className={`min-h-[60px] rounded transition-colors ${
                            isDragOver ? 'bg-green-50 border-2 border-dashed border-green-400' : ''
                          }`}>
                            {absences.length === 0 && shifts.length === 0 ? (
                              <div className="flex items-center justify-center py-4">
                                <button
                                  onClick={() => handleCreateClick(es.employee.id, day)}
                                  className="text-gray-400 hover:text-primary-600 hover:bg-primary-50 p-2 rounded transition-colors"
                                  title="Termin hinzufügen"
                                >
                                  <Plus className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {absences.map((absence) => {
                                  const isSingleDay = absence.start_date === absence.end_date;
                                  const isFullDay = absence.start_time === '00:00:00' && absence.end_time === '23:59:59';
                                  const showTime = isSingleDay && !isFullDay;

                                  return (
                                    <div
                                      key={absence.id}
                                      className="w-full bg-orange-100 border border-orange-200 rounded px-2 py-1.5"
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
                                {shifts.map((shift) => (
                                  <div
                                    key={shift.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(shift, e)}
                                    onClick={() => handleShiftClick(shift)}
                                    className={`w-full rounded px-2 py-1.5 transition-colors cursor-move text-left ${
                                      draggedShift?.id === shift.id ? 'opacity-50' : ''
                                    } ${
                                      shift.seeking_replacement
                                        ? 'bg-yellow-50 border-2 border-yellow-400 border-dashed hover:bg-yellow-100'
                                        : 'bg-blue-100 border border-blue-200 hover:bg-blue-200 hover:border-blue-300'
                                    }`}
                                  >
                                    <div className={`font-semibold truncate ${
                                      shift.seeking_replacement ? 'text-yellow-900' : 'text-blue-900'
                                    }`}>
                                      {shift.client_name}
                                    </div>
                                    <div className={`mt-0.5 ${
                                      shift.seeking_replacement ? 'text-yellow-700' : 'text-primary-700'
                                    }`}>
                                      {shift.time_from.substring(0, 5)} - {shift.time_to.substring(0, 5)}
                                    </div>
                                    {shift.notes && (
                                      <div className={`text-xs mt-0.5 truncate ${
                                        shift.seeking_replacement ? 'text-yellow-600' : 'text-primary-600'
                                      }`} title={shift.notes}>
                                        {shift.notes}
                                      </div>
                                    )}
                                    {shift.seeking_replacement && (
                                      <div className="text-xs font-semibold text-yellow-800 mt-1">
                                        Vertretung gesucht
                                      </div>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                      className="flex items-center gap-1 mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-semibold py-0.5 px-1.5 rounded transition-colors uppercase"
                                      title="Buchung"
                                    >
                                      <FileText className="w-2.5 h-2.5" />
                                      Buchung
                                    </button>
                                  </div>
                                ))}
                                <div className="flex items-center justify-center pt-1">
                                  <button
                                    onClick={() => handleCreateClick(es.employee.id, day)}
                                    className="text-gray-400 hover:text-primary-600 hover:bg-primary-50 p-1 rounded transition-colors"
                                    title="Termin hinzufügen"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
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
                                    onClick={() => handleShiftClick(shift)}
                                    className="w-full bg-amber-100 border-2 border-amber-400 rounded px-2 py-1.5 cursor-pointer hover:bg-amber-200 transition-colors text-left"
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
        </div>
        );
      })}

      {federalStateGroups.length === 0 && (
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
              {getAllRegionGroups().reduce((sum, group) => sum + group.employeeShifts.length, 0)}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Gesamt Termine</div>
            <div className="text-2xl font-bold text-gray-900">
              {getAllRegionGroups().reduce((sum, group) =>
                sum + group.employeeShifts.reduce((s, es) => s + es.shifts.length, 0), 0
              )}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Ø Termine/MA</div>
            <div className="text-2xl font-bold text-gray-900">
              {(() => {
                const regionGroups = getAllRegionGroups();
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
              {getAllRegionGroups().reduce((sum, group) =>
                sum + group.employeeShifts.filter(es => es.shifts.length > 0).length, 0
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {editMode ? 'Termin bearbeiten' : 'Termin Details'}
              </h3>
              <button
                onClick={() => {
                  setSelectedShift(null);
                  setEditMode(false);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Person
                    </label>
                    <select
                      value={editForm.employee_id}
                      onChange={(e) => setEditForm({ ...editForm, employee_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Bitte wählen...</option>
                      {allEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.full_name || employee.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Datum
                    </label>
                    <input
                      type="date"
                      value={editForm.shift_date}
                      onChange={(e) => setEditForm({ ...editForm, shift_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Von
                      </label>
                      <input
                        type="time"
                        value={editForm.time_from}
                        onChange={(e) => setEditForm({ ...editForm, time_from: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bis
                      </label>
                      <input
                        type="time"
                        value={editForm.time_to}
                        onChange={(e) => setEditForm({ ...editForm, time_to: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kunde
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
                      Notizen
                    </label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedShift.employee_id ? (
                    <div>
                      <div className="text-sm text-gray-600">Person</div>
                      <div className="text-lg font-medium text-gray-900">
                        {getEmployeeName(selectedShift.employee_id)}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm text-gray-600">Art</div>
                      <div className="text-lg font-medium text-amber-900">
                        Offener Termin
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-gray-600">Datum</div>
                    <div className="text-lg font-medium text-gray-900">
                      {new Date(selectedShift.shift_date + 'T00:00:00').toLocaleDateString('de-DE', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Zeit</div>
                    <div className="text-lg font-medium text-gray-900">
                      {selectedShift.time_from.substring(0, 5)} - {selectedShift.time_to.substring(0, 5)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Kunde</div>
                    <div className="text-lg font-medium text-gray-900">{selectedShift.client_name}</div>
                  </div>
                  {selectedShift.notes && (
                    <div>
                      <div className="text-sm text-gray-600">Notizen</div>
                      <div className="text-gray-900">{selectedShift.notes}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              {editMode ? (
                <>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleEditShift}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold rounded-lg transition-colors"
                  >
                    Speichern
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleDeleteShift}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Löschen
                  </button>
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Bearbeiten
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center gap-3 p-6 border-b border-gray-200">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Fehler
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

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Neuer Termin
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setErrorMessage(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Person *
                  </label>
                  <select
                    value={createForm.employee_id}
                    onChange={(e) => setCreateForm({ ...createForm, employee_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Bitte wählen...</option>
                    {allEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.full_name || employee.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Datum *
                  </label>
                  <input
                    type="date"
                    value={createForm.shift_date}
                    onChange={(e) => setCreateForm({ ...createForm, shift_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Von *
                    </label>
                    <input
                      type="time"
                      value={createForm.time_from}
                      onChange={(e) => setCreateForm({ ...createForm, time_from: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                    />
                  </div>
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
                    Notizen
                  </label>
                  <textarea
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setErrorMessage(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateShift}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] rounded-lg transition-colors"
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
