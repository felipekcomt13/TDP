import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BadgeSocio from '../components/BadgeSocio';

const MiMembresiaPage = () => {
  const { profile, membresia, esSocio, diasRestantes } = useAuth();
  const navigate = useNavigate();

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    // Agregar T12:00:00 para evitar problemas de zona horaria
    const fechaLocal = new Date(fecha + 'T12:00:00');
    return fechaLocal.toLocaleDateString('es-PE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const obtenerColorDias = (dias) => {
    if (dias <= 7) return 'text-red-600';
    if (dias <= 15) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-white min-h-full">
      <div className="px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-black tracking-tight mb-2">
            MI MEMBRESIA
          </h1>
          <p className="text-gray-600 text-sm tracking-wide">
            Información sobre tu membresía de socio
          </p>
        </div>

        {esSocio() && membresia ? (
          <>
            {/* Estado de membresía activa */}
            <div className="bg-gray-50 border-l-4 border-black p-8 mb-8">
              <div className="flex items-center gap-4 mb-6">
                <BadgeSocio className="text-sm px-4 py-1" />
                <span className="text-[10px] uppercase tracking-widest text-green-600 font-semibold">
                  Membresía Activa
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">
                    Válida desde
                  </p>
                  <p className="text-2xl font-bold text-black">
                    {formatearFecha(membresia.fecha_inicio)}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">
                    Válida hasta
                  </p>
                  <p className="text-2xl font-bold text-black">
                    {formatearFecha(membresia.fecha_fin)}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">
                    Días restantes
                  </p>
                  <p className={`text-4xl font-bold ${obtenerColorDias(diasRestantes())}`}>
                    {diasRestantes()}
                    <span className="text-lg ml-2">días</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 p-6">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-4 font-semibold">
                  Beneficios de Socio
                </p>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="mr-3 text-black">•</span>
                    <span>Acceso prioritario a reservas</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-3 text-black">•</span>
                    <span>Descuentos exclusivos en eventos</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-3 text-black">•</span>
                    <span>Participación en torneos de socios</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-3 text-black">•</span>
                    <span>Insignia de socio visible</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white border border-gray-200 p-6">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-4 font-semibold">
                  Renovación
                </p>
                <p className="text-sm text-gray-700 mb-4">
                  Para renovar tu membresía, acércate a nuestro local antes de que expire.
                  Nuestro equipo te ayudará con el proceso de renovación.
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Horario de atención:</span><br />
                  Lunes a Sábado: 8:00 AM - 10:00 PM<br />
                  Domingo: 9:00 AM - 8:00 PM
                </p>
              </div>
            </div>

            {/* Aviso de vencimiento próximo */}
            {diasRestantes() <= 7 && (
              <div className="mt-8 bg-red-50 border-l-4 border-red-600 p-6">
                <p className="text-[10px] uppercase tracking-widest text-red-600 mb-2 font-semibold">
                  Atención
                </p>
                <p className="text-sm text-red-800">
                  Tu membresía está por vencer. Te recomendamos renovarla pronto para no perder tus beneficios de socio.
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Estado sin membresía */}
            <div className="bg-gray-50 border-l-4 border-gray-400 p-8 mb-8">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-4 font-semibold">
                Estado
              </p>
              <p className="text-3xl font-bold text-gray-700 mb-4">
                Aún no eres socio
              </p>
              <p className="text-gray-600">
                Hazte socio para disfrutar de beneficios exclusivos en Triple Doble.
              </p>
            </div>

            {/* Cómo hacerse socio */}
            <div className="bg-white border border-gray-200 p-8">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-6 font-semibold">
                ¿Cómo hacerse socio?
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-black mb-1">Acércate a nuestro local</p>
                    <p className="text-sm text-gray-600">
                      Visita Triple Doble en nuestro horario de atención.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-black mb-1">Elige tu plan</p>
                    <p className="text-sm text-gray-600">
                      Tenemos opciones de membresía mensual, trimestral y anual.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-black mb-1">Realiza el pago</p>
                    <p className="text-sm text-gray-600">
                      Aceptamos efectivo, Yape, Plin y transferencias bancarias.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-bold">
                    4
                  </div>
                  <div>
                    <p className="font-semibold text-black mb-1">¡Listo!</p>
                    <p className="text-sm text-gray-600">
                      Tu membresía se activará inmediatamente y podrás ver tu insignia de socio.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Beneficios */}
            <div className="mt-8 bg-black text-white p-8">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-6 font-semibold">
                Beneficios de ser socio
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-white">✓</span>
                  <span className="text-sm">Acceso prioritario a reservas</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-white">✓</span>
                  <span className="text-sm">Descuentos exclusivos en eventos</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-white">✓</span>
                  <span className="text-sm">Participación en torneos de socios</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-white">✓</span>
                  <span className="text-sm">Insignia de socio visible</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Contacto */}
        <div className="mt-8 bg-gray-50 border-l-2 border-black p-6">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3 font-semibold">
            ¿Tienes preguntas?
          </p>
          <p className="text-sm text-gray-700">
            Si tienes alguna consulta sobre tu membresía, contáctanos directamente en el local o escríbenos por WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MiMembresiaPage;
