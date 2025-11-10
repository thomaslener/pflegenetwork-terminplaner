import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { MainAdminView } from './components/admin/MainAdminView';
import { MainEmployeeView } from './components/employee/MainEmployeeView';

function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600">Lädt...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <LoginPage />;
  }

  if (profile.role === 'admin') {
    return <MainAdminView />;
  }

  return <MainEmployeeView />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
