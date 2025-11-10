import { useState } from 'react';
import { MainNavigation } from '../MainNavigation';
import { AdminDashboard } from './AdminDashboard';
import { ClientManagement } from './ClientManagement';
import { EmployeeManagement } from './EmployeeManagement';

export function MainAdminView() {
  const [currentView, setCurrentView] = useState('terminplaner');

  const renderContent = () => {
    switch (currentView) {
      case 'terminplaner':
        return <AdminDashboard />;
      case 'klienten':
        return (
          <div className="p-6">
            <ClientManagement />
          </div>
        );
      case 'vertragsfaelle':
        return (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Vertragsfälle</h2>
              <p className="text-gray-600">Dieser Bereich wird bald verfügbar sein.</p>
            </div>
          </div>
        );
      case 'mein-profil':
        return (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Mein Profil</h2>
              <p className="text-gray-600">Dieser Bereich wird bald verfügbar sein.</p>
            </div>
          </div>
        );
      case 'partner-mitarbeiter':
        return (
          <div className="p-6">
            <EmployeeManagement />
          </div>
        );
      case 'finanzen':
        return (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Finanzen</h2>
              <p className="text-gray-600">Dieser Bereich wird bald verfügbar sein.</p>
            </div>
          </div>
        );
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <MainNavigation currentView={currentView} onNavigate={setCurrentView}>
      {renderContent()}
    </MainNavigation>
  );
}
