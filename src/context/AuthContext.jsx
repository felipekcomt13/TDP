import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        obtenerPerfil(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        obtenerPerfil(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const obtenerPerfil = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // El perfil no existe, el trigger debería haberlo creado
        // Esperamos un momento y reintentamos
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: retryData, error: retryError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (retryError) {
          console.error('Error al obtener perfil después de retry:', retryError);
          setProfile(null);
        } else {
          setProfile(retryData);
        }
      } else if (error) {
        console.error('Error al obtener perfil:', error);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error inesperado al obtener perfil:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, nombre) => {
    try {
      // Pasar el nombre en los metadatos para que el trigger lo use
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre: nombre || email.split('@')[0]
          }
        }
      });

      if (error) throw error;

      // El perfil se crea automáticamente mediante el trigger handle_new_user()
      // No es necesario hacer INSERT manual aquí

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const isAdmin = () => {
    const esAdmin = profile?.role === 'admin';
    console.log('🔍 [AuthContext] isAdmin check:', {
      user: user?.email,
      profile: profile,
      role: profile?.role,
      esAdmin: esAdmin
    });
    return esAdmin;
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    isAdmin,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
