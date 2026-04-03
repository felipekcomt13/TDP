import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ReservasProvider } from './context/ReservasContext';
import { SociosComercialesProvider } from './context/SociosComercialesContext';
import { HeroConfigProvider } from './context/HeroConfigContext';
import { KioscoProvider } from './context/KioscoContext';
import { CuentasProvider } from './context/CuentasContext';
import { CanchasProvider } from './context/CanchasContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminPanel from './pages/admin/AdminPanel';
import GestionUsuarios from './pages/admin/GestionUsuarios';
import GestionMembresias from './pages/admin/GestionMembresias';
import GestionSociosComerciales from './pages/admin/GestionSociosComerciales';
import KioscoAdmin from './pages/admin/KioscoAdmin';
import CuentasAdmin from './pages/admin/CuentasAdmin';
import AjustesAdmin from './pages/admin/AjustesAdmin';
import ReclamacionesAdmin from './pages/admin/ReclamacionesAdmin';
import MiMembresiaPage from './pages/MiMembresiaPage';
import CampoPage from './pages/CampoPage';
import SociosComercialesPage from './pages/SociosComercialesPage';
import LibroReclamacionesPage from './pages/LibroReclamacionesPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ReservasProvider>
          <CanchasProvider>
          <SociosComercialesProvider>
          <HeroConfigProvider>
          <KioscoProvider>
          <CuentasProvider>
          <Routes>
            {/* Login y reset password sin layout */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Todas las demás rutas con AppLayout */}
            <Route path="/" element={<AppLayout><LandingPage /></AppLayout>} />
            <Route path="/reservas" element={<AppLayout><HomePage /></AppLayout>} />
            <Route path="/reservar" element={<Navigate to="/reservas" replace />} />
            <Route path="/campo" element={<AppLayout><CampoPage /></AppLayout>} />
            <Route path="/libro-reclamaciones" element={<AppLayout><LibroReclamacionesPage /></AppLayout>} />
            <Route path="/socios-comerciales" element={<AppLayout><SociosComercialesPage /></AppLayout>} />
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
            <Route
              path="/admin/socios-comerciales"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AppLayout><GestionSociosComerciales /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/kiosco"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AppLayout><KioscoAdmin /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/cuentas"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AppLayout><CuentasAdmin /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reclamaciones"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AppLayout><ReclamacionesAdmin /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ajustes"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AppLayout><AjustesAdmin /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ajustes/*"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AppLayout><AjustesAdmin /></AppLayout>
                </ProtectedRoute>
              }
            />
            {/* Redirects para rutas viejas */}
            <Route path="/admin/canchas" element={<Navigate to="/admin/ajustes/canchas" replace />} />
            <Route path="/admin/configuracion" element={<Navigate to="/admin/ajustes/configuracion" replace />} />
          </Routes>
          </CuentasProvider>
          </KioscoProvider>
          </HeroConfigProvider>

          </SociosComercialesProvider>
          </CanchasProvider>
        </ReservasProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
