import { Pencil, Trash2, Clock, User, Users, FileText, MapPin } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Shift = Database['public']['Tables']['shifts']['Row'] & {
  employee_name?: string;
  original_employee_name?: string;
  region_name?: string;
};

interface ShiftListProps {
  shifts: Shift[];
  onEdit: (shift: Shift) => void;
  onDelete: (id: string) => void;
  onTakeOver?: (id: string) => void;
  currentUserId?: string;
  emptyMessage?: string;
}

export function ShiftList({ shifts, onEdit, onDelete, onTakeOver, currentUserId, emptyMessage }: ShiftListProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  const isReplacementShift = (shift: Shift) => {
    return shift.original_employee_id && shift.original_employee_name;
  };

  const getStartOfNextWeek = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    return nextMonday;
  };

  const groupShiftsByWeek = (shifts: Shift[]) => {
    const nextWeekStart = getStartOfNextWeek();
    const thisWeek: Shift[] = [];
    const nextWeek: Shift[] = [];

    shifts.forEach(shift => {
      const shiftDate = new Date(`${shift.shift_date}T00:00:00`);
      if (shiftDate >= nextWeekStart) {
        nextWeek.push(shift);
      } else {
        thisWeek.push(shift);
      }
    });

    return { thisWeek, nextWeek };
  };

  if (shifts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white border border-slate-200 rounded-lg">
        {emptyMessage || 'Keine Termine vorhanden. Fügen Sie einen neuen Termin hinzu.'}
      </div>
    );
  }

  const { thisWeek, nextWeek } = groupShiftsByWeek(shifts);

  const renderShift = (shift: Shift) => {
        const isOwnShift = currentUserId && shift.employee_id === currentUserId;
        const isOpenShift = shift.open_shift;
        const isReplacementRequest = !isOpenShift && shift.seeking_replacement && onTakeOver && !isOwnShift;
        const isOwnSeekingReplacement = shift.seeking_replacement && isOwnShift;
        const canTakeOver = onTakeOver && !isOwnShift && (isReplacementRequest || isOpenShift);
        const cardClasses = isOpenShift
          ? 'bg-blue-50 border-2 border-blue-300 border-dashed hover:shadow-lg'
          : isReplacementRequest
          ? 'bg-yellow-50 border-2 border-yellow-300 border-dashed hover:shadow-lg'
          : 'bg-white border border-slate-200 hover:shadow-md';

        return (
          <div
            key={shift.id}
            className={`rounded-lg p-5 transition-all ${cardClasses}`}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {isOpenShift && (
                    <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Offener Termin
                    </span>
                  )}
                  {!isOpenShift && isReplacementRequest && (
                    <span className="inline-flex items-center gap-1.5 bg-yellow-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Vertretung gesucht
                    </span>
                  )}
                  {!isReplacementRequest && isReplacementShift(shift) && (
                    <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Vertretung für {shift.original_employee_name}
                    </span>
                  )}
                  {isOwnSeekingReplacement && (
                    <span className="inline-flex items-center gap-1.5 bg-yellow-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Vertretung wird gesucht
                    </span>
                  )}
                  {shift.region_name && (
                    <span className="inline-flex items-center gap-1.5 bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full text-xs font-medium">
                      <MapPin className="w-3 h-3" />
                      {shift.region_name}
                    </span>
                  )}
                </div>

                <div className="text-lg font-bold text-gray-900 mb-2">
                  {formatDate(shift.shift_date)}
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary-600" />
                    <span className="font-medium">{formatTime(shift.time_from)} - {formatTime(shift.time_to)}</span>
                  </div>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{shift.client_name}</span>
                  </div>
                </div>

                {(isOpenShift || isReplacementRequest) && shift.employee_name && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-3">
                    <Users className="w-3.5 h-3.5" />
                    <span>
                      {isOpenShift ? `Erstellt von ${shift.employee_name}` : `${shift.employee_name} sucht Vertretung`}
                    </span>
                  </div>
                )}

                {shift.notes && (
                  <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                    {shift.notes}
                  </div>
                )}

                {canTakeOver && (
                  <button
                    onClick={() => onTakeOver?.(shift.id)}
                    className={`mt-4 w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
                      isOpenShift
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                        : 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md'
                    }`}
                  >
                    {isOpenShift ? 'Termin übernehmen' : 'Vertretung übernehmen'}
                  </button>
                )}
              </div>

              {!isReplacementRequest && isOwnShift && (
                <div className="flex gap-1">
                  <button
                    onClick={() => onEdit(shift)}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Bearbeiten"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(shift.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
  };

  return (
    <div className="space-y-6">
      {thisWeek.length > 0 && (
        <div className="space-y-3">
          {thisWeek.map((shift) => renderShift(shift))}
        </div>
      )}

      {nextWeek.length > 0 && (
        <div className="space-y-3">
          <div className="pt-4 border-t border-gray-300">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Ab nächster Woche</h4>
          </div>
          {nextWeek.map((shift) => renderShift(shift))}
        </div>
      )}
    </div>
  );
}
