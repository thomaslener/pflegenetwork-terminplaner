import { useState } from 'react';
import { Calendar, Clock, LogOut, Users, Plane } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { MyShifts } from './MyShifts';
import { WeeklyTemplates } from './WeeklyTemplates';
import { WeeklyOverviewReadOnly } from './WeeklyOverviewReadOnly';
import { MyAbsences } from './MyAbsences';

type Tab = 'shifts' | 'templates' | 'overview' | 'absences';

export function EmployeeDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('shifts');

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/pni2.svg" alt="pflege network" className="w-10 h-10" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">pflege network Terminplaner</h1>
                <p className="text-xs text-gray-500">Meine Termine</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{profile?.full_name || profile?.email}</p>
                <p className="text-xs text-gray-500">Person</p>
              </div>
              <button
                onClick={signOut}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Abmelden"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('shifts')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                  activeTab === 'shifts'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-5 h-5" />
                Meine Termine
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                  activeTab === 'templates'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-5 h-5" />
                Wochen-Vorlagen
              </button>
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                  activeTab === 'overview'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-slate-50'
                }`}
              >
                <Users className="w-5 h-5" />
                Wochenübersicht
              </button>
              <button
                onClick={() => setActiveTab('absences')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                  activeTab === 'absences'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-slate-50'
                }`}
              >
                <Plane className="w-5 h-5" />
                Abwesenheiten
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'shifts' && <MyShifts />}
            {activeTab === 'templates' && <WeeklyTemplates />}
            {activeTab === 'overview' && <WeeklyOverviewReadOnly />}
            {activeTab === 'absences' && <MyAbsences />}
          </div>
        </div>
      </div>
    </div>
  );
}
