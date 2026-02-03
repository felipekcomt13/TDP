import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase/client';

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
  const [membresia, setMembresia] = useState(null);
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
        setMembresia(null);
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
          setProfile(null);
        } else {
          setProfile(retryData);
          // Cargar membresía si es socio
          if (retryData?.es_socio) {
            await obtenerMembresia(userId);
          }
        }
      } else if (error) {
        setProfile(null);
      } else {
        setProfile(data);
        // Cargar membresía si es socio
        if (data?.es_socio) {
          await obtenerMembresia(userId);
        }
      }
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const obtenerMembresia = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('membresias')
        .select('*')
        .eq('user_id', userId)
        .eq('estado', 'activa')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Error silenciado en producción
      }
      setMembresia(data || null);
    } catch {
      setMembresia(null);
    }
  };

  const signUp = async (email, password, nombre, celular = '', dni = '') => {
    try {
      // Pasar el nombre, celular y dni en los metadatos para que el trigger lo use
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre: nombre || email.split('@')[0],
            celular: celular || null,
            dni: dni || null
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
    } catch {
      // Error silenciado en producción
    }
  };

  const isAdmin = () => {
    return profile?.role === 'admin';
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const esSocio = () => {
    return profile?.es_socio === true;
  };

  const diasRestantes = () => {
    if (!membresia?.fecha_fin) return 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    // Agregar T12:00:00 para evitar problemas de zona horaria
    const fechaFin = new Date(membresia.fecha_fin + 'T12:00:00');
    fechaFin.setHours(0, 0, 0, 0);
    const diferencia = fechaFin - hoy;
    return Math.max(0, Math.ceil(diferencia / (1000 * 60 * 60 * 24)));
  };

  const recargarMembresia = async () => {
    if (user?.id) {
      await obtenerMembresia(user.id);
      await obtenerPerfil(user.id);
    }
  };

  const value = {
    user,
    profile,
    membresia,
    loading,
    signUp,
    signIn,
    signOut,
    isAdmin,
    isAuthenticated,
    esSocio,
    diasRestantes,
    recargarMembresia,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
