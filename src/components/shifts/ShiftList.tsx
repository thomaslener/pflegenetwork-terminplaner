import { Pencil, Trash2, Clock, User, Users } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Shift = Database['public']['Tables']['shifts']['Row'] & {
  employee_name?: string;
  original_employee_name?: string;
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
          ? 'bg-blue-50 border-2 border-blue-300 border-dashed hover:shadow-md hover:border-blue-400'
          : isReplacementRequest
          ? 'bg-yellow-50 border-2 border-yellow-300 border-dashed hover:shadow-md hover:border-yellow-400'
          : 'bg-white border border-slate-200 hover:shadow-md';
        const primaryTextColor = isOpenShift ? 'text-blue-900' : isReplacementRequest ? 'text-yellow-900' : 'text-gray-900';
        const dividerColor = isOpenShift ? 'text-blue-300' : isReplacementRequest ? 'text-yellow-400' : 'text-gray-400';
        const timeRangeColor = isOpenShift ? 'text-blue-700' : isReplacementRequest ? 'text-yellow-800' : 'text-gray-700';
        const clockIconColor = isOpenShift ? 'text-blue-600' : isReplacementRequest ? 'text-yellow-600' : 'text-primary-600';
        const userIconColor = isOpenShift ? 'text-blue-600' : isReplacementRequest ? 'text-yellow-600' : 'text-gray-400';
        const notesClasses = isOpenShift
          ? 'text-blue-700 bg-blue-100'
          : isReplacementRequest
          ? 'text-yellow-700 bg-yellow-100'
          : 'text-gray-600 bg-slate-50';
        const takeoverButtonClasses = isOpenShift
          ? 'mt-3 bg-blue-600 hover:bg-blue-700 text-[#2e2e2e] text-sm font-semibold py-2 px-4 rounded-lg transition-colors shadow-sm'
          : 'mt-3 bg-green-600 hover:bg-green-700 text-[#2e2e2e] text-sm font-semibold py-2 px-4 rounded-lg transition-colors shadow-sm';
        const takeoverLabel = isOpenShift ? 'Termin übernehmen' : 'Vertretung übernehmen?';

        return (
          <div
            key={shift.id}
            className={`rounded-lg p-4 transition-shadow ${cardClasses}`}
          >
            {isOpenShift && (
              <div className="mb-3 flex items-center gap-2">
                <span className="bg-blue-200 px-3 py-1 rounded-full text-blue-800 font-semibold text-sm">Offener Termin</span>
                {shift.employee_name && (
                  <div className="flex items-center gap-1.5 text-blue-700 text-sm">
                    <Users className="w-4 h-4" />
                    <span>{shift.employee_name} hat diesen Termin erstellt</span>
                  </div>
                )}
              </div>
            )}

            {!isOpenShift && isReplacementRequest && (
              <div className="mb-3 flex items-center gap-2">
                <span className="bg-yellow-200 px-3 py-1 rounded-full text-yellow-800 font-semibold text-sm">Vertretungsanfrage</span>
                {shift.employee_name && (
                  <div className="flex items-center gap-1.5 text-yellow-700 text-sm">
                    <Users className="w-4 h-4" />
                    <span>{shift.employee_name} sucht Vertretung</span>
                  </div>
                )}
              </div>
            )}

            {!isReplacementRequest && isReplacementShift(shift) && (
              <div className="mb-3">
                <span className="bg-blue-100 px-3 py-1 rounded-full text-blue-800 font-semibold text-sm">
                  In Vertretung für {shift.original_employee_name}
                </span>
              </div>
            )}

            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 font-medium ${primaryTextColor}`}>
                    <Clock className={`w-4 h-4 ${clockIconColor}`} />
                    <span>{formatDate(shift.shift_date)}</span>
                  </div>
                  <span className={dividerColor}>•</span>
                  <span className={timeRangeColor}>
                    {formatTime(shift.time_from)} - {formatTime(shift.time_to)}
                  </span>
                </div>

                <div className={`flex items-center gap-2 ${primaryTextColor}`}>
                  <User className={`w-4 h-4 ${userIconColor}`} />
                  <span className="font-medium">{shift.client_name}</span>
                </div>

                {shift.notes && (
                  <div className={`text-sm p-3 rounded-lg ${notesClasses}`}>
                    {shift.notes}
                  </div>
                )}

                {isOwnSeekingReplacement && (
                  <div className="mt-3 bg-yellow-100 px-3 py-2 rounded-lg">
                    <span className="text-yellow-800 font-semibold text-sm">
                      Vertretung wird gesucht
                    </span>
                  </div>
                )}

                {isOwnShift && isOpenShift && (
                  <div className="mt-3 bg-blue-100 px-3 py-2 rounded-lg">
                    <span className="text-blue-800 font-semibold text-sm">
                      Dieser Termin ist als offen markiert
                    </span>
                  </div>
                )}

                {canTakeOver && (
                  <button
                    onClick={() => onTakeOver?.(shift.id)}
                    className={takeoverButtonClasses}
                  >
                    {takeoverLabel}
                  </button>
                )}
              </div>

              {!isReplacementRequest && isOwnShift && (
                <div className="flex gap-1 ml-4">
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
