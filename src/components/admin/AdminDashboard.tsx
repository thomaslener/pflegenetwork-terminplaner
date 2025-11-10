import { useState } from 'react';
import { Users, MapPin, Calendar, LayoutDashboard, Plane, Briefcase } from 'lucide-react';
import { EmployeeManagement } from './EmployeeManagement';
import { RegionManagement } from './RegionManagement';
import { AdminShiftManagement } from './AdminShiftManagement';
import { WeeklyOverview } from './WeeklyOverview';
import { AbsenceManagement } from './AbsenceManagement';

type Tab = 'overview' | 'employees' | 'regions' | 'shifts' | 'absences' | 'partners';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <nav className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-slate-50'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                Wochenübersicht
              </button>
              <button
                onClick={() => setActiveTab('shifts')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'shifts'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-5 h-5" />
                Terminverwaltung
              </button>
              <button
                onClick={() => setActiveTab('absences')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'absences'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-slate-50'
                }`}
              >
                <Plane className="w-5 h-5" />
                Abwesenheiten
              </button>
              <button
                onClick={() => setActiveTab('employees')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'employees'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-slate-50'
                }`}
              >
                <Users className="w-5 h-5" />
                Personen
              </button>
              <button
                onClick={() => setActiveTab('regions')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'regions'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-slate-50'
                }`}
              >
                <MapPin className="w-5 h-5" />
                Regionen
              </button>
              <button
                onClick={() => setActiveTab('partners')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'partners'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-slate-50'
                }`}
              >
                <Briefcase className="w-5 h-5" />
                Partner & Mitarbeiter
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && <WeeklyOverview />}
            {activeTab === 'employees' && <EmployeeManagement />}
            {activeTab === 'regions' && <RegionManagement />}
            {activeTab === 'shifts' && <AdminShiftManagement />}
            {activeTab === 'absences' && <AbsenceManagement />}
            {activeTab === 'partners' && <div className="text-gray-500">Partner & Mitarbeiter Verwaltung kommt bald...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
