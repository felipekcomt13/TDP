import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ReservasProvider } from './context/ReservasContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import ReservasPage from './pages/ReservasPage';
import LoginPage from './pages/LoginPage';
import AdminPanel from './pages/admin/AdminPanel';
import GestionUsuarios from './pages/admin/GestionUsuarios';
import GestionMembresias from './pages/admin/GestionMembresias';
import MiMembresiaPage from './pages/MiMembresiaPage';
import CampoPage from './pages/CampoPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ReservasProvider>
          <Routes>
            {/* Login sin layout */}
            <Route path="/login" element={<LoginPage />} />

            {/* Todas las demás rutas con AppLayout */}
            <Route path="/" element={<AppLayout><LandingPage /></AppLayout>} />
            <Route path="/reservar" element={<AppLayout><HomePage /></AppLayout>} />
            <Route path="/campo" element={<AppLayout><CampoPage /></AppLayout>} />
            <Route
              path="/reservas"
              element={
                <ProtectedRoute>
                  <AppLayout><ReservasPage /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/mi-membresia"
              element={
                <ProtectedRoute>
                  <AppLayout><MiMembresiaPage /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AppLayout><AdminPanel /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/usuarios"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AppLayout><GestionUsuarios /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/socios"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AppLayout><GestionMembresias /></AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </ReservasProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
