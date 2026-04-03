import { useState } from 'react';
import { supabase } from '../services/supabase/client';

const PROVEEDOR = {
  razonSocial: 'Complejo Deportivo Triple Doble',
  ruc: '20615033074',
  domicilio: 'Huayna Cápac 1670, La Victoria 14007',
};

const generarCorrelativo = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `LR-${y}${m}${d}-${rand}`;
};

const camposVacios = {
  consumidor_nombre: '',
  consumidor_dni: '',
  consumidor_telefono: '',
  consumidor_email: '',
  es_menor_edad: false,
  representante_nombre: '',
  representante_dni: '',
  representante_telefono: '',
  representante_email: '',
  tipo_bien_servicio: 'servicio',
  descripcion_bien_servicio: '',
  monto: '',
  tipo_reclamacion: 'reclamo',
  detalle: '',
  pedido: '',
  acepta_terminos: false,
};

const LibroReclamacionesPage = () => {
  const [form, setForm] = useState(camposVacios);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(null); // { correlativo, fecha }
  const [error, setError] = useState('');

  const set = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.acepta_terminos) {
      setError('Debes confirmar que los datos son correctos para continuar.');
      return;
    }

    setEnviando(true);

    const correlativo = generarCorrelativo();
    const ahora = new Date().toISOString();

    const payload = {
      correlativo,
      fecha_registro: ahora,
      consumidor_nombre: form.consumidor_nombre.trim(),
      consumidor_dni: form.consumidor_dni.trim(),
      consumidor_telefono: form.consumidor_telefono.trim(),
      consumidor_email: form.consumidor_email.trim(),
      es_menor_edad: form.es_menor_edad,
      representante_nombre: form.es_menor_edad ? form.representante_nombre.trim() : null,
      representante_dni: form.es_menor_edad ? form.representante_dni.trim() : null,
      representante_telefono: form.es_menor_edad ? form.representante_telefono.trim() : null,
      representante_email: form.es_menor_edad ? form.representante_email.trim() : null,
      tipo_bien_servicio: form.tipo_bien_servicio,
      descripcion_bien_servicio: form.descripcion_bien_servicio.trim(),
      monto: form.monto ? parseFloat(form.monto) : null,
      tipo_reclamacion: form.tipo_reclamacion,
      detalle: form.detalle.trim(),
      pedido: form.pedido.trim(),
      acepta_terminos: true,
      fecha_confirmacion: ahora,
    };

    const { error: dbError } = await supabase
      .from('libro_reclamaciones')
      .insert(payload);

    setEnviando(false);

    if (dbError) {
      setError('Ocurrió un error al registrar tu reclamación. Por favor intenta nuevamente o comunícate con nosotros por WhatsApp.');
      return;
    }

    setExito({ correlativo, fecha: ahora });
    setForm(camposVacios);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (exito) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-black mb-2">Reclamación registrada</h2>
            <p className="text-gray-500 text-sm mb-6">
              Tu reclamación ha sido registrada correctamente. Tienes derecho a recibir respuesta en un plazo máximo de <strong>15 días hábiles</strong>.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Número de reclamación</span>
                <span className="font-bold text-black">{exito.correlativo}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Fecha de registro</span>
                <span className="font-medium text-black">
                  {new Date(exito.fecha).toLocaleString('es-PE', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Proveedor</span>
                <span className="font-medium text-black">{PROVEEDOR.razonSocial}</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-6">
              Guarda o imprime el número de reclamación <strong>{exito.correlativo}</strong> para hacer seguimiento.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Imprimir constancia
              </button>
              <button
                onClick={() => setExito(null)}
                className="px-6 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Nueva reclamación
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-2xl mx-auto">

        {/* Encabezado oficial */}
        <div className="border border-gray-300 rounded-xl overflow-hidden mb-6">
          <div className="bg-black text-white px-6 py-4 flex items-center gap-3">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <h1 className="text-base font-bold tracking-wide uppercase">Libro de Reclamaciones</h1>
              <p className="text-xs text-gray-300">Ley N° 29571 — Código de Protección y Defensa del Consumidor</p>
            </div>
          </div>

          {/* Datos del proveedor */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2 font-semibold">Datos del proveedor</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Razón social</p>
                <p className="font-medium text-black">{PROVEEDOR.razonSocial}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">RUC</p>
                <p className="font-medium text-black">{PROVEEDOR.ruc}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Domicilio</p>
                <p className="font-medium text-black">{PROVEEDOR.domicilio}</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* SECCIÓN A: Datos del consumidor */}
          <SeccionCard letra="A" titulo="Identificación del consumidor">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="Nombre completo *" htmlFor="cons_nombre">
                <input
                  id="cons_nombre"
                  type="text"
                  required
                  maxLength={120}
                  placeholder="Nombres y apellidos"
                  value={form.consumidor_nombre}
                  onChange={e => set('consumidor_nombre', e.target.value)}
                  className={inputCls}
                />
              </Campo>
              <Campo label="DNI *" htmlFor="cons_dni">
                <input
                  id="cons_dni"
                  type="text"
                  required
                  pattern="[0-9]{8}"
                  maxLength={8}
                  placeholder="12345678"
                  value={form.consumidor_dni}
                  onChange={e => set('consumidor_dni', e.target.value.replace(/\D/g, ''))}
                  className={inputCls}
                />
              </Campo>
              <Campo label="Teléfono *" htmlFor="cons_tel">
                <input
                  id="cons_tel"
                  type="tel"
                  required
                  maxLength={15}
                  placeholder="+51 999 999 999"
                  value={form.consumidor_telefono}
                  onChange={e => set('consumidor_telefono', e.target.value)}
                  className={inputCls}
                />
              </Campo>
              <Campo label="Correo electrónico *" htmlFor="cons_email">
                <input
                  id="cons_email"
                  type="email"
                  required
                  placeholder="correo@ejemplo.com"
                  value={form.consumidor_email}
                  onChange={e => set('consumidor_email', e.target.value)}
                  className={inputCls}
                />
              </Campo>
            </div>

            {/* ¿Menor de edad? */}
            <label className="flex items-center gap-3 mt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.es_menor_edad}
                onChange={e => set('es_menor_edad', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
              />
              <span className="text-sm text-gray-700">El consumidor es menor de edad</span>
            </label>

            {form.es_menor_edad && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Datos del padre / representante legal</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Campo label="Nombre completo *" htmlFor="rep_nombre">
                    <input
                      id="rep_nombre"
                      type="text"
                      required
                      maxLength={120}
                      value={form.representante_nombre}
                      onChange={e => set('representante_nombre', e.target.value)}
                      className={inputCls}
                    />
                  </Campo>
                  <Campo label="DNI *" htmlFor="rep_dni">
                    <input
                      id="rep_dni"
                      type="text"
                      required
                      pattern="[0-9]{8}"
                      maxLength={8}
                      value={form.representante_dni}
                      onChange={e => set('representante_dni', e.target.value.replace(/\D/g, ''))}
                      className={inputCls}
                    />
                  </Campo>
                  <Campo label="Teléfono *" htmlFor="rep_tel">
                    <input
                      id="rep_tel"
                      type="tel"
                      required
                      maxLength={15}
                      value={form.representante_telefono}
                      onChange={e => set('representante_telefono', e.target.value)}
                      className={inputCls}
                    />
                  </Campo>
                  <Campo label="Correo electrónico *" htmlFor="rep_email">
                    <input
                      id="rep_email"
                      type="email"
                      required
                      value={form.representante_email}
                      onChange={e => set('representante_email', e.target.value)}
                      className={inputCls}
                    />
                  </Campo>
                </div>
              </div>
            )}
          </SeccionCard>

          {/* SECCIÓN B: Bien o servicio */}
          <SeccionCard letra="B" titulo="Identificación del bien contratado o servicio prestado">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="Tipo *" htmlFor="tipo_bien">
                <select
                  id="tipo_bien"
                  required
                  value={form.tipo_bien_servicio}
                  onChange={e => set('tipo_bien_servicio', e.target.value)}
                  className={inputCls}
                >
                  <option value="servicio">Servicio</option>
                  <option value="producto">Producto</option>
                </select>
              </Campo>
              <Campo label="Monto pagado (S/)" htmlFor="monto">
                <input
                  id="monto"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.monto}
                  onChange={e => set('monto', e.target.value)}
                  className={inputCls}
                />
              </Campo>
            </div>
            <Campo label="Descripción del bien o servicio *" htmlFor="desc_bien">
              <input
                id="desc_bien"
                type="text"
                required
                maxLength={250}
                placeholder="Ej. Alquiler de cancha de básquetbol — 1 hora"
                value={form.descripcion_bien_servicio}
                onChange={e => set('descripcion_bien_servicio', e.target.value)}
                className={inputCls}
              />
            </Campo>
          </SeccionCard>

          {/* SECCIÓN C: Detalle de la reclamación */}
          <SeccionCard letra="C" titulo="Detalle de la reclamación o queja">
            <Campo label="Tipo de registro *" htmlFor="tipo_rec">
              <div className="flex gap-4">
                {[
                  { value: 'reclamo', label: 'Reclamo', desc: 'Disconformidad con el bien o servicio' },
                  { value: 'queja', label: 'Queja', desc: 'Malestar o desacuerdo con la atención' },
                ].map(opt => (
                  <label
                    key={opt.value}
                    className={`flex-1 flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      form.tipo_reclamacion === opt.value
                        ? 'border-black bg-black text-white'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipo_reclamacion"
                      value={opt.value}
                      checked={form.tipo_reclamacion === opt.value}
                      onChange={() => set('tipo_reclamacion', opt.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className={`text-xs ${form.tipo_reclamacion === opt.value ? 'text-gray-300' : 'text-gray-500'}`}>{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </Campo>
            <Campo label="Descripción del hecho *" htmlFor="detalle">
              <textarea
                id="detalle"
                required
                rows={4}
                maxLength={1000}
                placeholder="Describe con claridad qué ocurrió, cuándo y cómo..."
                value={form.detalle}
                onChange={e => set('detalle', e.target.value)}
                className={inputCls + ' resize-none'}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{form.detalle.length}/1000</p>
            </Campo>
            <Campo label="Pedido del consumidor *" htmlFor="pedido">
              <textarea
                id="pedido"
                required
                rows={3}
                maxLength={500}
                placeholder="¿Qué solución o compensación solicitas?"
                value={form.pedido}
                onChange={e => set('pedido', e.target.value)}
                className={inputCls + ' resize-none'}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{form.pedido.length}/500</p>
            </Campo>
          </SeccionCard>

          {/* SECCIÓN D: Conformidad */}
          <SeccionCard letra="D" titulo="Conformidad del consumidor">
            <p className="text-xs text-gray-500 mb-4">
              De acuerdo al Reglamento del Libro de Reclamaciones (DS 011-2011-PCM), la aceptación electrónica reemplaza
              la firma física y constituye constancia de conformidad con los términos de la reclamación.
            </p>
            <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              form.acepta_terminos ? 'border-black bg-black text-white' : 'border-gray-200 hover:border-gray-400'
            }`}>
              <input
                type="checkbox"
                required
                checked={form.acepta_terminos}
                onChange={e => set('acepta_terminos', e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0"
              />
              <span className={`text-sm leading-relaxed ${form.acepta_terminos ? 'text-white' : 'text-gray-700'}`}>
                Declaro que la información consignada es verídica y que el presente registro constituye
                mi conformidad con los términos de la reclamación, según lo establecido en el
                Código de Protección y Defensa del Consumidor (Ley N° 29571).
              </span>
            </label>
          </SeccionCard>

          {/* Aviso legal */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-4 text-xs text-gray-500 space-y-1">
            <p><strong>Plazo de respuesta:</strong> El proveedor tiene <strong>15 días hábiles</strong> para responder tu reclamación (Ley N° 31435).</p>
            <p><strong>Conservación:</strong> El registro se mantiene por un mínimo de 2 años.</p>
            <p><strong>INDECOPI:</strong> Si no recibes respuesta en el plazo legal, puedes presentar tu reclamo en <strong>consumidor.gob.pe</strong> o llamar al <strong>224-7777</strong>.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full py-4 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando ? 'Registrando reclamación...' : 'Registrar reclamación'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Componentes auxiliares
const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white text-black placeholder-gray-400';

const SeccionCard = ({ letra, titulo, children }) => (
  <div className="border border-gray-200 rounded-xl overflow-hidden">
    <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200">
      <span className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
        {letra}
      </span>
      <h3 className="text-sm font-semibold text-black">{titulo}</h3>
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

const Campo = ({ label, htmlFor, children }) => (
  <div className="space-y-1.5">
    <label htmlFor={htmlFor} className="block text-xs font-medium text-gray-600">{label}</label>
    {children}
  </div>
);

export default LibroReclamacionesPage;
