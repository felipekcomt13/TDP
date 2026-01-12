import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, profile, loading } = useAuth();

  console.log('🔒 [ProtectedRoute] Check:', {
    loading,
    user: user?.email,
    profile,
    requireAdmin,
    profileRole: profile?.role,
    willBlock: requireAdmin && profile?.role !== 'admin'
  });

  if (loading) {
    console.log('⏳ [ProtectedRoute] Loading...');
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold text-black tracking-tight">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('❌ [ProtectedRoute] No user, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && profile?.role !== 'admin') {
    console.log('❌ [ProtectedRoute] Admin required but user is not admin, redirecting to /');
    return <Navigate to="/" replace />;
  }

  console.log('✅ [ProtectedRoute] Access granted');
  return children;
};

export default ProtectedRoute;
