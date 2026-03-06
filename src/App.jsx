import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ReservasProvider } from './context/ReservasContext';
import { SociosComercialesProvider } from './context/SociosComercialesContext';
import { HeroConfigProvider } from './context/HeroConfigContext';
import { KioscoProvider } from './context/KioscoContext';
import { CanchasProvider } from './context/CanchasContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import ReservasPage from './pages/ReservasPage';
import LoginPage from './pages/LoginPage';
import AdminPanel from './pages/admin/AdminPanel';
import GestionUsuarios from './pages/admin/GestionUsuarios';
import GestionMembresias from './pages/admin/GestionMembresias';
import GestionSociosComerciales from './pages/admin/GestionSociosComerciales';
import ConfiguracionSitio from './pages/admin/ConfiguracionSitio';
import KioscoAdmin from './pages/admin/KioscoAdmin';
import GestionCanchas from './pages/admin/GestionCanchas';
import MiMembresiaPage from './pages/MiMembresiaPage';
import CampoPage from './pages/CampoPage';
import SociosComercialesPage from './pages/SociosComercialesPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ReservasProvider>
          <CanchasProvider>
          <SociosComercialesProvider>
          <HeroConfigProvider>
          <KioscoProvider>
          <Routes>
            {/* Login sin layout */}
            <Route path="/login" element={<LoginPage />} />

            {/* Todas las demás rutas con AppLayout */}
            <Route path="/" element={<AppLayout><LandingPage /></AppLayout>} />
            <Route path="/reservar" element={<AppLayout><HomePage /></AppLayout>} />
            <Route path="/campo" element={<AppLayout><CampoPage /></AppLayout>} />
            <Route path="/socios-comerciales" element={<AppLayout><SociosComercialesPage /></AppLayout>} />
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
            <Route
              path="/admin/socios-comerciales"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AppLayout><GestionSociosComerciales /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/configuracion"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AppLayout><ConfiguracionSitio /></AppLayout>
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
              path="/admin/canchas"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AppLayout><GestionCanchas /></AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
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
