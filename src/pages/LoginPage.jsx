import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    celular: '',
    dni: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          if (error.message === 'Invalid login credentials') {
            setError('Email o contraseña incorrectos. Verifica tus datos e intenta de nuevo.');
          } else if (error.message === 'Failed to fetch' || error.message?.includes('fetch')) {
            setError('No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta de nuevo.');
          } else if (error.status === 429) {
            setError('Demasiados intentos de inicio de sesión. Por favor espera unos minutos.');
          } else if (error.message?.includes('network') || error.message?.includes('Network')) {
            setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
          } else {
            setError('No se pudo iniciar sesión. Intenta de nuevo más tarde.');
          }
        } else {
          navigate('/');
        }
      } else {
        // Registro
        if (!formData.nombre.trim()) {
          setError('El nombre es obligatorio');
          setLoading(false);
          return;
        }

        // Validar celular (9 dígitos, comienza con 9)
        if (!/^9\d{8}$/.test(formData.celular.trim())) {
          setError('El celular debe tener 9 dígitos y comenzar con 9');
          setLoading(false);
          return;
        }

        // Validar DNI (8 dígitos numéricos)
        if (!/^\d{8}$/.test(formData.dni.trim())) {
          setError('El DNI debe tener exactamente 8 dígitos');
          setLoading(false);
          return;
        }

        const { error } = await signUp(formData.email, formData.password, formData.nombre, formData.celular, formData.dni);
        if (error) {
          if (error.message?.includes('already registered')) {
            setError('Este email ya está registrado');
          } else if (error.message?.includes('Email rate limit exceeded')) {
            setError('Demasiados intentos. Por favor espera unos minutos e intenta de nuevo.');
          } else if (error.message === 'Failed to fetch' || error.message?.includes('fetch')) {
            setError('No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta de nuevo.');
          } else if (error.status === 429) {
            setError('Demasiadas solicitudes. Por favor espera 5-10 minutos antes de intentar nuevamente.');
          } else if (error.message?.includes('network') || error.message?.includes('Network')) {
            setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
          } else {
            setError('No se pudo crear la cuenta. Intenta de nuevo más tarde.');
          }
        } else {
          setSuccessMessage('Cuenta creada exitosamente. Ya puedes iniciar sesión.');
          setFormData({ email: '', password: '', nombre: '', celular: '', dni: '' });
        }
      }
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.message?.includes('fetch')) {
        setError('No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta de nuevo.');
      } else {
        setError('Ocurrió un error inesperado. Intenta de nuevo más tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12 px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-black mb-3 tracking-tight uppercase">
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h1>
          <p className="text-gray-600 text-sm tracking-wide">
            {isLogin ? 'Accede a tu cuenta para gestionar tus reservas' : 'Regístrate para guardar y gestionar tus reservas'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {error && (
            <div className="bg-red-50 rounded-xl border border-red-200 text-red-800 px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 rounded-xl border border-green-200 text-green-800 px-4 py-3 mb-6 text-sm">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-600 mb-2">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white text-black placeholder-gray-400 transition-all"
                  placeholder="Juan Pérez"
                  required={!isLogin}
                />
              </div>
            )}

            {!isLogin && (
              <div>
                <label htmlFor="celular" className="block text-sm font-medium text-gray-600 mb-2">
                  Número de celular *
                </label>
                <input
                  type="tel"
                  id="celular"
                  name="celular"
                  value={formData.celular}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white text-black placeholder-gray-400 transition-all"
                  placeholder="987654321"
                  maxLength="9"
                  required={!isLogin}
                />
                <p className="text-xs text-gray-500 mt-1">9 dígitos, comenzando con 9</p>
              </div>
            )}

            {!isLogin && (
              <div>
                <label htmlFor="dni" className="block text-sm font-medium text-gray-600 mb-2">
                  DNI *
                </label>
                <input
                  type="text"
                  id="dni"
                  name="dni"
                  value={formData.dni}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white text-black placeholder-gray-400 transition-all"
                  placeholder="12345678"
                  maxLength="8"
                  required={!isLogin}
                />
                <p className="text-xs text-gray-500 mt-1">8 dígitos</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-2">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white text-black placeholder-gray-400 transition-all"
                placeholder="correo@ejemplo.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-600 mb-2">
                Contraseña *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white text-black placeholder-gray-400 transition-all"
                placeholder="••••••••"
                required
                minLength={6}
              />
              {!isLogin && (
                <p className="text-xs text-gray-500 mt-2">Mínimo 6 caracteres</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full px-6 py-4 bg-black text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md hover:bg-gray-800 active:scale-[0.98] transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSuccessMessage('');
                setFormData({ email: '', password: '', nombre: '', celular: '', dni: '' });
              }}
              className="text-sm text-gray-600 hover:text-black transition-colors"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        </div>

        <div className="mt-8 bg-gray-50 rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600 mb-3">
            Nota
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            El registro es opcional. Puedes hacer reservas sin crear una cuenta,
            pero no podrás ver el historial de tus reservas posteriormente.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
