import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase/client';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
        setChecking(false);
        return;
      }

      // Escuchar evento de cambio de auth (Supabase procesa tokens de la URL)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
          setSessionReady(true);
          setChecking(false);
        }
      });

      // Timeout: si después de 5 segundos no hay sesión, el link es inválido
      const timeout = setTimeout(() => {
        setChecking(false);
      }, 5000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeout);
      };
    };

    checkSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError('No se pudo actualizar la contraseña. Intenta solicitar un nuevo link de recuperación.');
      } else {
        setSuccess(true);
        setTimeout(async () => {
          await supabase.auth.signOut();
          navigate('/login');
        }, 3000);
      }
    } catch {
      setError('Ocurrió un error inesperado. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Verificando sesión
  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center py-12 px-6">
        <div className="text-center">
          <svg className="w-8 h-8 animate-spin text-black mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-gray-400">Verificando link de recuperación...</p>
        </div>
      </div>
    );
  }

  // Link inválido o expirado
  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center py-12 px-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-4xl font-bold text-black mb-3 tracking-tight uppercase">
            LINK INVALIDO
          </h1>
          <p className="text-gray-600 text-sm tracking-wide mb-8">
            Este link de recuperación es inválido o ha expirado. Solicita uno nuevo.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-4 bg-black text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md hover:bg-gray-800 active:scale-[0.98] transition-all"
          >
            VOLVER AL LOGIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12 px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-black mb-3 tracking-tight uppercase">
            {success ? 'CONTRASEÑA ACTUALIZADA' : 'NUEVA CONTRASEÑA'}
          </h1>
          <p className="text-gray-600 text-sm tracking-wide">
            {success
              ? 'Tu contraseña se actualizó correctamente. Redirigiendo al login...'
              : 'Ingresa tu nueva contraseña'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {!success ? (
            <>
              {error && (
                <div className="bg-red-50 rounded-xl border border-red-200 text-red-800 px-4 py-3 mb-6 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-600 mb-2">
                    Nueva contraseña *
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white text-black placeholder-gray-400 transition-all"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-gray-500 mt-2">Mínimo 6 caracteres</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-600 mb-2">
                    Confirmar contraseña *
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white text-black placeholder-gray-400 transition-all"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-4 bg-black text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md hover:bg-gray-800 active:scale-[0.98] transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'ACTUALIZANDO...' : 'ACTUALIZAR CONTRASEÑA'}
                </button>
              </form>
            </>
          ) : (
            <div className="bg-green-50 rounded-xl border border-green-200 text-green-800 px-4 py-3 text-sm text-center">
              Contraseña actualizada exitosamente. Serás redirigido al login en unos segundos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
