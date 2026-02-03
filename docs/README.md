# Sistema de Gestión de Horarios - Cancha de Basket

Aplicación web desarrollada con React para gestionar las reservas de horarios de una cancha de basketball.

## Características

- **Calendario Semanal Interactivo**: Visualiza la disponibilidad de horarios por día y hora
- **Gestión de Reservas**: Crea, visualiza y elimina reservas fácilmente
- **Sistema de Autenticación**: Login opcional con Supabase Auth
- **Usuarios Anónimos**: Permite hacer reservas sin crear una cuenta
- **Gestión de Usuarios**: Sistema de roles (Usuario y Administrador)
- **Panel de Administración**: Los admins pueden aprobar/rechazar reservas
- **Base de Datos en la Nube**: Almacenamiento persistente con Supabase
- **Actualizaciones en Tiempo Real**: Los cambios se reflejan automáticamente
- **Interfaz Responsive**: Diseño adaptable para dispositivos móviles y desktop
- **Validación de Disponibilidad**: Evita reservas duplicadas en el mismo horario
- **Reservas Multi-hora**: Selección de rangos de tiempo para reservas continuas

## Tecnologías Utilizadas

- **React 18** - Framework de JavaScript
- **Vite** - Build tool y servidor de desarrollo
- **React Router** - Navegación entre páginas
- **Supabase** - Backend as a Service (autenticación y base de datos)
- **Tailwind CSS** - Framework de estilos
- **date-fns** - Manejo de fechas y horarios
- **Context API** - Gestión de estado global

## Instalación

### Requisitos Previos
- Node.js 20.x o superior
- Una cuenta de [Supabase](https://supabase.com) (gratuita)

### Pasos de Instalación

1. Clona el repositorio:
```bash
git clone <url-del-repositorio>
cd TDP
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura Supabase:
   - Sigue las instrucciones detalladas en [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
   - Crea un proyecto en Supabase
   - Ejecuta el script SQL (`supabase-setup.sql`) en el SQL Editor
   - Configura las variables de entorno en `.env`

4. Inicia el servidor de desarrollo:
```bash
npm run dev
```

5. Abre tu navegador en `http://localhost:5173`

## Uso

### Como Usuario Anónimo (Sin Registro)

1. En la página principal, haz clic en "RESERVAR AHORA"
2. Navega por el calendario semanal
3. Selecciona un horario disponible o un rango de horas
4. Completa el formulario con tus datos
5. La reserva se enviará por WhatsApp para confirmación
6. ⚠️ **Nota**: No podrás ver el historial de tus reservas sin crear una cuenta

### Como Usuario Registrado

1. **Registro**:
   - Haz clic en "INICIAR SESIÓN" en el navbar
   - Selecciona "¿No tienes cuenta? Regístrate"
   - Completa el formulario con tu email y contraseña
   - Verifica tu email (si está habilitado en Supabase)

2. **Hacer Reservas**:
   - Las reservas quedarán asociadas a tu cuenta
   - Puedes seleccionar rangos de múltiples horas
   - El sistema valida disponibilidad en tiempo real

3. **Ver tus Reservas**:
   - Ve a "MIS RESERVAS" en el menú
   - Filtra por: Todas, Pendientes, Confirmadas, Próximas, Pasadas
   - Busca reservas específicas por nombre, DNI, teléfono o email
   - Elimina reservas si es necesario

### Como Administrador

1. **Acceso al Panel**:
   - Haz clic en "ADMIN" en el navbar (solo visible para admins)

2. **Gestión de Reservas**:
   - Ve todas las reservas del sistema
   - Filtra por estado: Todas, Pendientes, Confirmadas, Próximas
   - Busca reservas de cualquier usuario
   - **Aprobar** reservas pendientes
   - **Rechazar** reservas que no cumplan requisitos
   - Ve estadísticas en tiempo real

3. **Identificar Reservas**:
   - Reservas "Sin cuenta": hechas por usuarios anónimos
   - Reservas con usuario: asociadas a cuentas registradas

### Configuración

El sistema viene preconfigurado con:
- Horario: 08:00 - 22:00
- Intervalo de reserva: 60 minutos
- Días disponibles: Lunes a Domingo

Para modificar estos valores, puedes editar el archivo `src/context/ReservasContext.jsx`

## Estructura del Proyecto

```
src/
├── components/           # Componentes reutilizables
│   ├── CalendarioSemanal.jsx
│   ├── FormularioReserva.jsx
│   ├── ListaReservas.jsx
│   ├── Navbar.jsx
│   └── ProtectedRoute.jsx    # HOC para rutas protegidas
├── context/             # Contexto de React para estado global
│   ├── AuthContext.jsx       # Manejo de autenticación
│   └── ReservasContext.jsx   # Manejo de reservas
├── lib/                 # Utilidades y configuración
│   └── supabaseClient.js     # Cliente de Supabase
├── pages/               # Páginas de la aplicación
│   ├── AdminPanel.jsx        # Panel de administración
│   ├── HomePage.jsx
│   ├── LandingPage.jsx
│   ├── LoginPage.jsx         # Login y registro
│   └── ReservasPage.jsx
├── App.jsx              # Componente principal
└── main.jsx             # Punto de entrada
```

## Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Genera la versión de producción
- `npm run preview` - Vista previa de la versión de producción

## Características Futuras

- ✅ ~~Integración con backend para persistencia en base de datos~~ (Implementado con Supabase)
- ✅ ~~Autenticación de usuarios~~ (Implementado)
- ✅ ~~Panel de administración avanzado~~ (Implementado)
- Notificaciones por email automáticas
- Integración con pasarelas de pago (Mercado Pago, Stripe)
- Reservas recurrentes (semanales, mensuales)
- Exportar calendario a formatos externos (iCal, Google Calendar)
- Sistema de descuentos y promociones
- Reportes y analytics para administradores
- App móvil con React Native

## Contribución

Las contribuciones son bienvenidas. Por favor:

1. Haz un fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Roles y Permisos

### Usuario Anónimo
- ✅ Ver calendario de disponibilidad
- ✅ Crear reservas (sin asociar a cuenta)
- ❌ Ver historial de reservas

### Usuario Registrado (role: 'user')
- ✅ Ver calendario de disponibilidad
- ✅ Crear reservas asociadas a su cuenta
- ✅ Ver historial de sus propias reservas
- ✅ Eliminar sus propias reservas
- ❌ Ver/modificar reservas de otros usuarios

### Administrador (role: 'admin')
- ✅ Todo lo del usuario registrado
- ✅ Ver TODAS las reservas del sistema
- ✅ Aprobar reservas pendientes
- ✅ Rechazar reservas
- ✅ Eliminar cualquier reserva
- ✅ Ver estadísticas del sistema

## Seguridad

- Las contraseñas se almacenan de forma segura con Supabase Auth
- Row Level Security (RLS) protege los datos en la base de datos
- Las credenciales de API están en variables de entorno (no en el código)
- Solo los admins pueden modificar el estado de las reservas
- Los usuarios solo pueden ver/modificar sus propias reservas

## Licencia

Este proyecto está bajo la Licencia MIT.

## Autor

Desarrollado para gestión de canchas deportivas.
