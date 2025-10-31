import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { authService } from './services/api';

function App() {
  useEffect(() => {
    // Initialize CSRF token when app loads
    authService.init().catch(error => {
      console.error('Failed to initialize CSRF token:', error);
    });
  }, []);

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
}

export default App;
