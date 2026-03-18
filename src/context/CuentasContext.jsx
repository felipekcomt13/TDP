import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase/client';

const CuentasContext = createContext();

export const CUENTAS = [
  { id: 'tata', nombre: 'Cuenta Tata' },
  { id: 'david', nombre: 'Cuenta David' },
  { id: 'giancarlo', nombre: 'Cuenta Giancarlo' }
];

export const useCuentas = () => {
  const context = useContext(CuentasContext);
  if (!context) {
    throw new Error('useCuentas debe usarse dentro de un CuentasProvider');
  }
  return context;
};

export const CuentasProvider = ({ children }) => {
  const [movimientos, setMovimientos] = useState([]);
  const [saldos, setSaldos] = useState({ tata: 0, david: 0, giancarlo: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarMovimientos();

    const subscription = supabase
      .channel('movimientos_cuenta_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimientos_cuenta' }, () => {
        cargarMovimientos(false);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const cargarMovimientos = async (mostrarLoading = true) => {
    try {
      if (mostrarLoading) setLoading(true);
      const { data, error } = await supabase
        .from('movimientos_cuenta')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMovimientos(data || []);
      calcularSaldos(data || []);
    } catch {
      // Silenciado - RLS deniega para no-admins
    } finally {
      if (mostrarLoading) setLoading(false);
    }
  };

  const calcularSaldos = (movs) => {
    const nuevos = { tata: 0, david: 0, giancarlo: 0 };
    movs.forEach(m => {
      if (m.tipo === 'cargo') {
        nuevos[m.cuenta] += parseFloat(m.monto);
      } else {
        nuevos[m.cuenta] -= parseFloat(m.monto);
      }
    });
    setSaldos(nuevos);
  };

  const registrarCargo = async (cuenta, monto, descripcion, ventaKioscoId = null) => {
    const { data, error } = await supabase.rpc('registrar_movimiento_cuenta', {
      p_cuenta: cuenta,
      p_tipo: 'cargo',
      p_monto: monto,
      p_descripcion: descripcion,
      p_venta_kiosco_id: ventaKioscoId
    });

    if (error) throw error;
    await cargarMovimientos(false);
    return data;
  };

  const registrarAbono = async (cuenta, monto, descripcion) => {
    const { data, error } = await supabase.rpc('registrar_movimiento_cuenta', {
      p_cuenta: cuenta,
      p_tipo: 'abono',
      p_monto: monto,
      p_descripcion: descripcion
    });

    if (error) throw error;
    await cargarMovimientos(false);
    return data;
  };

  const value = {
    movimientos,
    saldos,
    loading,
    registrarCargo,
    registrarAbono,
    cargarMovimientos
  };

  return (
    <CuentasContext.Provider value={value}>
      {children}
    </CuentasContext.Provider>
  );
};
