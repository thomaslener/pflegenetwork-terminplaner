import { useState } from 'react';
import { MainNavigation } from '../MainNavigation';
import { EmployeeDashboard } from './EmployeeDashboard';

export function MainEmployeeView() {
  const [currentView, setCurrentView] = useState('terminplaner');

  const renderContent = () => {
    switch (currentView) {
      case 'terminplaner':
        return <EmployeeDashboard />;
      case 'klienten':
        return (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Klienten</h2>
              <p className="text-gray-600">Dieser Bereich wird bald verfügbar sein.</p>
            </div>
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
      case 'terminliste':
        return (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Terminliste</h2>
              <p className="text-gray-600">Dieser Bereich wird bald verfügbar sein.</p>
            </div>
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
        return <EmployeeDashboard />;
    }
  };

  return (
    <MainNavigation currentView={currentView} onNavigate={setCurrentView}>
      {renderContent()}
    </MainNavigation>
  );
}
