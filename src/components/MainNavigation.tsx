import { useState } from 'react';
import { Users, FileText, Calendar, User, List, DollarSign, LogOut, Menu, X, Briefcase } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type NavigationItem = {
  id: string;
  label: string;
  icon: typeof Users;
  adminOnly?: boolean;
  employeeOnly?: boolean;
};

const navigationItems: NavigationItem[] = [
  { id: 'terminplaner', label: 'Terminplaner', icon: Calendar },
  { id: 'klienten', label: 'Klienten', icon: Users },
  { id: 'vertragsfaelle', label: 'Vertragsfälle', icon: FileText },
  { id: 'terminliste', label: 'Terminchronik', icon: List },
  { id: 'partner-mitarbeiter', label: 'Partner & Mitarbeiter', icon: Briefcase },
  { id: 'finanzen', label: 'Finanzen', icon: DollarSign },
  { id: 'mein-profil', label: 'Mein Profil', icon: User },
];

interface MainNavigationProps {
  currentView: string;
  onNavigate: (view: string) => void;
  children: React.ReactNode;
}

export function MainNavigation({ currentView, onNavigate, children }: MainNavigationProps) {
  const { profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const filteredItems = navigationItems.filter(item => {
    if (item.adminOnly && profile?.role !== 'admin') return false;
    if (item.employeeOnly && profile?.role !== 'employee') return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <img src="/pni.svg" alt="PNI Logo" className="h-10 w-10" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Pflege Network</h1>
                <p className="text-xs text-gray-500">Pflegesystem</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* User Info and Sign Out */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                <p className="text-xs text-gray-500">
                  {profile?.role === 'admin' ? 'Administrator' : 'Mitarbeiter'}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Abmelden</span>
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-1">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                      ${isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <div className="pt-3 border-t border-gray-200">
                <div className="px-4 py-2">
                  <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {profile?.role === 'admin' ? 'Administrator' : 'Mitarbeiter'}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Abmelden</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-screen-2xl mx-auto">
        {children}
      </main>
    </div>
  );
}
