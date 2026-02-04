import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { Toaster } from './components/ui/toaster';
import { Layout } from './components/ui/layout';

// Pages
import { LoginPage } from './pages/Login';
import { InspectionPage } from './pages/Inspection';
import { AdminPage } from './pages/Admin';
import { BoardPage } from './pages/Board';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/inspection" replace />} />
          <Route path="inspection" element={<InspectionPage />} />
          <Route path="admin/*" element={<AdminPage />} />
          <Route path="board" element={<BoardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      <OfflineIndicator />
    </>
  );
}

export default App;
