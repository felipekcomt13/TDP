import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ReservasProvider } from './context/ReservasContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import ReservasPage from './pages/ReservasPage';
import LoginPage from './pages/LoginPage';
import AdminPanel from './pages/AdminPanel';
import GestionUsuarios from './pages/GestionUsuarios';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ReservasProvider>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/reservar" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/reservas"
                element={
                  <ProtectedRoute>
                    <ReservasPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/usuarios"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <GestionUsuarios />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </ReservasProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
