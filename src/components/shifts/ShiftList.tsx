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
}

export function ShiftList({ shifts, onEdit, onDelete, onTakeOver, currentUserId }: ShiftListProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('de-DE', {
      weekday: 'short',
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

  if (shifts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white border border-slate-200 rounded-lg">
        Keine Termine vorhanden. Fügen Sie einen neuen Termin hinzu.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {shifts.map((shift) => {
        const isOwnShift = currentUserId && shift.employee_id === currentUserId;
        const isReplacementRequest = shift.seeking_replacement && onTakeOver && !isOwnShift;
        const isOwnSeekingReplacement = shift.seeking_replacement && isOwnShift;

        return (
          <div
            key={shift.id}
            className={`rounded-lg p-4 transition-shadow ${
              isReplacementRequest
                ? 'bg-yellow-50 border-2 border-yellow-300 border-dashed hover:shadow-md hover:border-yellow-400'
                : 'bg-white border border-slate-200 hover:shadow-md'
            }`}
          >
            {isReplacementRequest && (
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
                  <div className={`flex items-center gap-2 font-medium ${
                    isReplacementRequest ? 'text-yellow-900' : 'text-gray-900'
                  }`}>
                    <Clock className={`w-4 h-4 ${
                      isReplacementRequest ? 'text-yellow-600' : 'text-primary-600'
                    }`} />
                    <span>{formatDate(shift.shift_date)}</span>
                  </div>
                  <span className={isReplacementRequest ? 'text-yellow-400' : 'text-gray-400'}>•</span>
                  <span className={isReplacementRequest ? 'text-yellow-800' : 'text-gray-700'}>
                    {formatTime(shift.time_from)} - {formatTime(shift.time_to)}
                  </span>
                </div>

                <div className={`flex items-center gap-2 ${
                  isReplacementRequest ? 'text-yellow-900' : 'text-gray-900'
                }`}>
                  <User className={`w-4 h-4 ${
                    isReplacementRequest ? 'text-yellow-600' : 'text-gray-400'
                  }`} />
                  <span className="font-medium">{shift.client_name}</span>
                </div>

                {shift.notes && (
                  <div className={`text-sm p-3 rounded-lg ${
                    isReplacementRequest
                      ? 'text-yellow-700 bg-yellow-100'
                      : 'text-gray-600 bg-slate-50'
                  }`}>
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

                {isReplacementRequest && (
                  <button
                    onClick={() => onTakeOver(shift.id)}
                    className="mt-3 bg-green-600 hover:bg-green-700 text-[#2e2e2e] text-sm font-semibold py-2 px-4 rounded-lg transition-colors shadow-sm"
                  >
                    Vertretung übernehmen?
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
      })}
    </div>
  );
}
