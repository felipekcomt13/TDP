import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import GestionCanchas from './GestionCanchas';
import ConfiguracionSitio from './ConfiguracionSitio';

const TABS = [
  { id: 'canchas', label: 'Canchas', path: '/admin/ajustes/canchas' },
  { id: 'configuracion', label: 'Configuracion', path: '/admin/ajustes/configuracion' }
];

const AjustesAdmin = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determinar tab activo por URL
  const tabFromUrl = location.pathname.includes('/configuracion') ? 'configuracion' : 'canchas';
  const [tabActivo, setTabActivo] = useState(tabFromUrl);

  if (!isAdmin()) {
    navigate('/');
    return null;
  }

  const cambiarTab = (tab) => {
    setTabActivo(tab.id);
    navigate(tab.path, { replace: true });
  };

  return (
    <div className="bg-white min-h-full">
      <div className="px-4 md:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-black tracking-tight">AJUSTES</h1>
          <p className="text-gray-500 text-sm mt-1">Canchas y configuracion del sitio</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => cambiarTab(tab)}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                tabActivo === tab.id
                  ? 'text-black'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
              {tabActivo === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
          ))}
        </div>

        {/* Contenido del tab */}
        {tabActivo === 'canchas' && <GestionCanchas embedded />}
        {tabActivo === 'configuracion' && <ConfiguracionSitio embedded />}
      </div>
    </div>
  );
};

export default AjustesAdmin;
