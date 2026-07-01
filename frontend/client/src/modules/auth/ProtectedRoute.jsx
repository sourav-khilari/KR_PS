import { LoginPage } from './LoginPage.jsx';
import { useAuth } from './AuthContext.jsx';

export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <LoginPage />;
}
