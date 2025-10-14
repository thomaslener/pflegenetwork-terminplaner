import { Pencil, Trash2, Clock, User, Users, FileText, MapPin, Check, BookOpen } from 'lucide-react';
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
    const dateObj = new Date(date);
    const weekday = dateObj.toLocaleDateString('de-DE', { weekday: 'long' });
    const dateStr = dateObj.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return { weekday, dateStr };
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
          ? 'bg-orange-50 border-2 border-orange-300 border-dashed hover:shadow-lg'
          : 'bg-green-50 border-2 border-green-300 hover:shadow-lg';

        return (
          <div
            key={shift.id}
            className={`rounded-lg p-4 transition-all relative ${cardClasses}`}
          >
            {(isOpenShift || isReplacementRequest) && shift.region_name && (
              <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-700 text-white">
                  <MapPin className="w-3 h-3" />
                  {shift.region_name}
                </span>
              </div>
            )}

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-lg text-gray-900">{shift.client_name}</span>
                  {isOwnSeekingReplacement && (
                    <span className="inline-flex items-center gap-1 bg-orange-600 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      Vertretung wird gesucht
                    </span>
                  )}
                  {!isOpenShift && !isReplacementRequest && !isOwnSeekingReplacement && !isReplacementRequest && isReplacementShift(shift) && (
                    <span className="inline-flex items-center gap-1 bg-blue-600 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      Vertretung für {shift.original_employee_name}
                    </span>
                  )}
                </div>

                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <span className="font-medium">{formatDate(shift.shift_date).weekday}, {formatDate(shift.shift_date).dateStr}</span>
                  <div className="flex-1"></div>
                  <div className="text-right whitespace-nowrap">
                    <span className="font-medium">{formatTime(shift.time_from)} - {formatTime(shift.time_to)}</span>
                  </div>
                </div>


                {shift.notes && (
                  <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                    {shift.notes}
                  </div>
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

            {canTakeOver && (
              <div className="flex justify-end mt-3">
                <button
                  onClick={() => onTakeOver?.(shift.id)}
                  className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg font-medium text-xs transition-all ${
                    isOpenShift
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                      : 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  Annehmen
                </button>
              </div>
            )}

            {(isOpenShift || isReplacementRequest) && shift.employee_name && (
              <div className="absolute bottom-3 left-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {isOpenShift ? `Erstellt von ${shift.employee_name}` : `${shift.employee_name} sucht Vertretung`}
                  </span>
                </div>
              </div>
            )}

            {isOwnShift && !isReplacementRequest && (
              <div className="flex justify-end mt-3">
                <button
                  className="inline-flex items-center gap-1.5 bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors shadow-sm"
                  title="Buchung"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Buchung
                </button>
              </div>
            )}
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
