import { Navigate } from 'react-router-dom';
import { authService } from '../services/api';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    // Redirect to auth page if not logged in
    return <Navigate to="/auth" replace />;
  }

  return children;
};

export default ProtectedRoute;