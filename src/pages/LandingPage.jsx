import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const { isAdmin } = useAuth();
  const pasos = [
    {
      numero: 1,
      titulo: 'Elige tu horario',
      descripcion: 'Selecciona la fecha y hora que mejor se adapte a tus necesidades en nuestro calendario interactivo.'
    },
    {
      numero: 2,
      titulo: 'Completa el formulario',
      descripcion: 'Ingresa tus datos personales: nombre, DNI, teléfono y correo electrónico.'
    },
    {
      numero: 3,
      titulo: 'Envía tu solicitud',
      descripcion: 'Serás redirigido automáticamente a WhatsApp con tu información de reserva prellenada.'
    },
    {
      numero: 4,
      titulo: 'Realiza el pago',
      descripcion: 'Efectúa el pago correspondiente (S/ 40 por hora) a través de los métodos disponibles.'
    },
    {
      numero: 5,
      titulo: 'Envía el comprobante',
      descripcion: 'Adjunta la foto del comprobante de pago en el chat de WhatsApp.'
    },
    {
      numero: 6,
      titulo: 'Confirmación',
      descripcion: 'Nuestro equipo revisará tu pago y confirmará tu reserva a la brevedad.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-black text-white py-24">
        <div className="container mx-auto px-6 lg:px-8 text-center">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">
              Bienvenido a
            </p>
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-6">
              COMPLEJO DEPORTIVO<br />TRIPLE DOBLE
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Reserva tu cancha de básquetbol de manera rápida y sencilla
            </p>
          </div>
        </div>
      </div>

      {/* Panel de Admin - Solo visible para administradores */}
      {isAdmin() && (
        <div className="bg-black text-white py-8 border-y border-gray-800">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">
                  Panel de Administrador
                </p>
                <p className="text-xl font-bold tracking-tight">
                  Acceso Rápido a Herramientas de Gestión
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  to="/admin"
                  className="px-6 py-3 bg-white text-black text-sm font-medium tracking-wide hover:bg-gray-200 transition-colors uppercase"
                >
                  Gestionar Reservas
                </Link>
                <Link
                  to="/admin/usuarios"
                  className="px-6 py-3 border border-white text-white text-sm font-medium tracking-wide hover:bg-white hover:text-black transition-colors uppercase"
                >
                  Gestionar Usuarios
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cómo Reservar */}
      <div className="container mx-auto px-6 lg:px-8 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-black mb-4 tracking-tight">
              CÓMO RESERVAR
            </h2>
            <p className="text-gray-600 text-sm uppercase tracking-wide">
              Sigue estos sencillos pasos
            </p>
          </div>

          {/* Pasos */}
          <div className="space-y-8">
            {pasos.map((paso, index) => (
              <div
                key={paso.numero}
                className="flex gap-6 items-start p-6 bg-gray-50 border-l-2 border-black hover:shadow-md transition-shadow"
              >
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-black text-white flex items-center justify-center">
                    <span className="text-2xl font-bold">{paso.numero}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-black mb-2 tracking-tight uppercase">
                    {paso.titulo}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {paso.descripcion}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="text-center mt-16">
            <Link
              to="/reservar"
              className="inline-block px-16 py-5 bg-black text-white text-lg font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors"
            >
              RESERVAR AHORA
            </Link>
            <p className="text-xs text-gray-500 mt-4 uppercase tracking-wide">
              Proceso rápido y seguro
            </p>
          </div>
        </div>
      </div>

      {/* Información de Contacto */}
      <div className="bg-gray-50 border-t border-gray-200 py-16">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-black mb-8 tracking-tight text-center uppercase">
              Información de Contacto
            </h2>

            <div className="bg-white border-l-2 border-black p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-semibold">
                    WhatsApp
                  </p>
                  <a
                    href="https://wa.me/51922803684"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-2xl font-bold text-black hover:text-gray-600 transition-colors"
                  >
                    +51 922 803 684
                  </a>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-semibold">
                    Tarifa
                  </p>
                  <p className="text-2xl font-bold text-black">
                    S/ 40 <span className="text-sm text-gray-600 font-normal">por hora</span>
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-200">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3 font-semibold">
                  Importante
                </p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Las reservas se confirman una vez verificado el pago</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Debes enviar el comprobante de pago por WhatsApp</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Puedes reservar de 1 hasta 14 horas continuas</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Horario de atención: 8:00 AM - 10:00 PM</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-black text-white py-12 text-center">
        <div className="container mx-auto px-6">
          <p className="text-sm uppercase tracking-widest text-gray-400 mb-4">
            ¿Listo para jugar?
          </p>
          <Link
            to="/reservar"
            className="inline-block px-12 py-4 bg-white text-black font-bold text-sm tracking-widest uppercase hover:bg-gray-200 transition-colors"
          >
            IR AL CALENDARIO
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
