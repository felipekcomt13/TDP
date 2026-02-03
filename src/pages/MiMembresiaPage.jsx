import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BadgeSocio from '../components/shared/BadgeSocio';

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
                  Para renovar tu membresía, comunícate con nosotros por WhatsApp antes de que expire.
                  Nuestro equipo te ayudará con el proceso de renovación.
                </p>
                <a
                  href="https://wa.me/51974341064?text=Hola,%20quiero%20renovar%20mi%20membresía"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Contactar por WhatsApp
                </a>
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
                    <p className="font-semibold text-black mb-1">Contáctanos por WhatsApp</p>
                    <p className="text-sm text-gray-600">
                      Escríbenos para solicitar tu membresía de socio.
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
                      Aceptamos Yape, Plin y transferencias bancarias. Envía el comprobante por WhatsApp.
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
                      Tu membresía se activará y podrás ver tu insignia de socio.
                    </p>
                  </div>
                </div>
              </div>

              <a
                href="https://wa.me/51974341064?text=Hola,%20quiero%20información%20para%20hacerme%20socio"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Quiero ser socio
              </a>
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
          <p className="text-sm text-gray-700 mb-4">
            Si tienes alguna consulta sobre tu membresía, escríbenos por WhatsApp.
          </p>
          <a
            href="https://wa.me/51974341064"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-700 font-semibold text-sm"
          >
            +51 974 341 064
          </a>
        </div>
      </div>
    </div>
  );
};

export default MiMembresiaPage;
