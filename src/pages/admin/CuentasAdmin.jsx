import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useCuentas, CUENTAS } from '../../context/CuentasContext';

const CuentasAdmin = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { movimientos, saldos, loading, registrarCargo, registrarAbono } = useCuentas();

  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [modalTipo, setModalTipo] = useState(null); // 'cargo' | 'abono'
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [filtroCuenta, setFiltroCuenta] = useState('todas');

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  const mostrarMensaje = (texto, tipo) => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 4000);
  };

  const abrirModal = (cuenta, tipo) => {
    setCuentaSeleccionada(cuenta);
    setModalTipo(tipo);
    setMonto('');
    setDescripcion('');
  };

  const cerrarModal = () => {
    setCuentaSeleccionada(null);
    setModalTipo(null);
    setMonto('');
    setDescripcion('');
  };

  const handleSubmit = async () => {
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      mostrarMensaje('Ingresa un monto valido', 'error');
      return;
    }

    setGuardando(true);
    try {
      const nombreCuenta = CUENTAS.find(c => c.id === cuentaSeleccionada)?.nombre;
      if (modalTipo === 'cargo') {
        await registrarCargo(cuentaSeleccionada, montoNum, descripcion || 'Cargo manual');
        mostrarMensaje(`Cargo de S/ ${montoNum.toFixed(2)} registrado en ${nombreCuenta}`, 'success');
      } else {
        await registrarAbono(cuentaSeleccionada, montoNum, descripcion || 'Abono');
        mostrarMensaje(`Abono de S/ ${montoNum.toFixed(2)} registrado en ${nombreCuenta}`, 'success');
      }
      cerrarModal();
    } catch (error) {
      mostrarMensaje('Error: ' + error.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const movimientosFiltrados = movimientos.filter(m => {
    if (filtroCuenta === 'todas') return true;
    return m.cuenta === filtroCuenta;
  });

  const formatearFechaHora = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNombreCuenta = (id) => CUENTAS.find(c => c.id === id)?.nombre || id;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-black" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  const totalDeuda = Object.values(saldos).reduce((sum, s) => sum + s, 0);

  return (
    <div className="bg-white min-h-full">
      <div className="px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-black tracking-tight mb-2">
            CUENTAS PERSONALES
          </h1>
          <p className="text-gray-600 text-sm tracking-wide">
            Gestiona las cuentas de credito personales
          </p>
        </div>

        {/* Mensaje de feedback */}
        {mensaje && (
          <div
            className={`mb-6 px-6 py-4 rounded-xl border ${
              mensaje.tipo === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {/* Cards de saldos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {CUENTAS.map((cuenta) => {
            const saldo = saldos[cuenta.id] || 0;
            return (
              <div
                key={cuenta.id}
                className={`rounded-2xl border p-6 transition-all ${
                  saldo > 0
                    ? 'border-red-200 bg-red-50/30'
                    : 'border-gray-100 bg-white'
                } shadow-sm hover:shadow-md`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-black uppercase tracking-wide">
                    {cuenta.nombre}
                  </h3>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    saldo > 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {saldo > 0 ? 'Con deuda' : 'Al dia'}
                  </span>
                </div>
                <p className={`text-3xl font-bold mb-5 ${
                  saldo > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  S/ {saldo.toFixed(2)}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => abrirModal(cuenta.id, 'cargo')}
                    className="flex-1 py-2.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 active:scale-[0.98] transition-all"
                  >
                    + Cargo
                  </button>
                  <button
                    onClick={() => abrirModal(cuenta.id, 'abono')}
                    className="flex-1 py-2.5 bg-green-50 text-green-600 text-xs font-medium rounded-lg hover:bg-green-100 active:scale-[0.98] transition-all"
                  >
                    - Abono
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total general */}
        <div className="bg-gray-900 text-white rounded-xl p-5 flex items-center justify-between mb-10">
          <span className="text-sm text-gray-300">
            Deuda total acumulada
          </span>
          <span className="text-xl font-bold">
            S/ {totalDeuda.toFixed(2)}
          </span>
        </div>

        {/* Historial de movimientos */}
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-black tracking-tight">
              MOVIMIENTOS
            </h2>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFiltroCuenta('todas')}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                  filtroCuenta === 'todas'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todas
              </button>
              {CUENTAS.map((cuenta) => (
                <button
                  key={cuenta.id}
                  onClick={() => setFiltroCuenta(cuenta.id)}
                  className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                    filtroCuenta === cuenta.id
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cuenta.nombre.replace('Cuenta ', '')}
                </button>
              ))}
            </div>
          </div>

          {movimientosFiltrados.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <p className="text-gray-400 text-sm">No hay movimientos registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {movimientosFiltrados.map((mov) => (
                <div
                  key={mov.id}
                  className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                        mov.tipo === 'cargo'
                          ? 'bg-red-50 text-red-600 border border-red-100'
                          : 'bg-green-50 text-green-600 border border-green-100'
                      }`}>
                        {mov.tipo === 'cargo' ? 'Cargo' : 'Abono'}
                      </span>
                      <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 text-gray-500">
                        {getNombreCuenta(mov.cuenta)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 truncate">
                      {mov.descripcion || (mov.tipo === 'cargo' ? 'Cargo' : 'Abono')}
                    </p>
                    <span className="text-xs text-gray-400">
                      {formatearFechaHora(mov.created_at)}
                    </span>
                  </div>
                  <div className="ml-4">
                    <span className={`font-semibold text-sm ${
                      mov.tipo === 'cargo' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {mov.tipo === 'cargo' ? '+' : '-'} S/ {parseFloat(mov.monto).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Cargo/Abono */}
      {modalTipo && cuentaSeleccionada && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-2xl">
            <h3 className="text-2xl font-bold text-black tracking-tight mb-2">
              {modalTipo === 'cargo' ? 'REGISTRAR CARGO' : 'REGISTRAR ABONO'}
            </h3>
            <p className="text-gray-600 mb-6">
              {getNombreCuenta(cuentaSeleccionada)}
              {modalTipo === 'abono' && (
                <span className="text-sm text-gray-400 ml-2">
                  (Deuda actual: S/ {(saldos[cuentaSeleccionada] || 0).toFixed(2)})
                </span>
              )}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Monto (S/)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white text-black text-sm placeholder-gray-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Descripcion (opcional)
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder={modalTipo === 'cargo' ? 'Ej: Compra en kiosco' : 'Ej: Pago en efectivo'}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white text-black text-sm placeholder-gray-400 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={cerrarModal}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={guardando}
                className={`flex-1 px-6 py-3 text-white text-xs font-medium rounded-lg shadow-sm hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-50 ${
                  modalTipo === 'cargo'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {guardando
                  ? 'Guardando...'
                  : modalTipo === 'cargo'
                    ? 'Registrar Cargo'
                    : 'Registrar Abono'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CuentasAdmin;
