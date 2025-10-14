import { useState } from 'react';
import { Users, MapPin, Calendar, LogOut, LayoutDashboard, Plane, CircleUser as UserCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { EmployeeManagement } from './EmployeeManagement';
import { RegionManagement } from './RegionManagement';
import { AdminShiftManagement } from './AdminShiftManagement';
import { WeeklyOverview } from './WeeklyOverview';
import { AbsenceManagement } from './AbsenceManagement';
import { ClientManagement } from './ClientManagement';

type Tab = 'overview' | 'employees' | 'regions' | 'shifts' | 'absences' | 'clients';

export function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/pn3.svg" alt="pflege network" className="w-10 h-10" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">pflege network Terminplaner</h1>
                <p className="text-xs text-gray-500">Admin-Bereich</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{profile?.full_name || profile?.email}</p>
                <p className="text-xs text-gray-500">Administrator</p>
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
                Termine
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
                onClick={() => setActiveTab('clients')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'clients'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-slate-50'
                }`}
              >
                <UserCircle className="w-5 h-5" />
                Klienten
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
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && <WeeklyOverview />}
            {activeTab === 'employees' && <EmployeeManagement />}
            {activeTab === 'regions' && <RegionManagement />}
            {activeTab === 'shifts' && <AdminShiftManagement />}
            {activeTab === 'absences' && <AbsenceManagement />}
            {activeTab === 'clients' && <ClientManagement />}
          </div>
        </div>
      </div>
    </div>
  );
}
