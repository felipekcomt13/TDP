# Configuración de Supabase

Esta guía te ayudará a configurar Supabase para el sistema de gestión de horarios.

## Paso 1: Crear un Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com) y crea una cuenta si no tienes una
2. Haz clic en "New Project"
3. Completa la información:
   - **Name**: TDP Reservas (o el nombre que prefieras)
   - **Database Password**: Guarda esta contraseña en un lugar seguro
   - **Region**: Elige la región más cercana a tu ubicación
4. Haz clic en "Create new project" y espera unos minutos mientras se crea

## Paso 2: Obtener las Credenciales

1. Una vez creado el proyecto, ve a **Settings** (⚙️) en el menú lateral
2. Haz clic en **API**
3. Copia los siguientes valores:
   - **Project URL** (VITE_SUPABASE_URL)
   - **anon/public key** (VITE_SUPABASE_ANON_KEY)

## Paso 3: Configurar las Variables de Entorno

1. Abre el archivo `.env` en la raíz del proyecto
2. Reemplaza los valores de ejemplo con tus credenciales:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

## Paso 4: Ejecutar el Script SQL

1. En Supabase, ve a **SQL Editor** en el menú lateral
2. Haz clic en **+ New query**
3. Copia todo el contenido del archivo `supabase-setup.sql` de este proyecto
4. Pégalo en el editor
5. Haz clic en **Run** (o presiona Ctrl+Enter)
6. Verifica que no haya errores. Deberías ver "Success. No rows returned"

## Paso 5: Verificar las Tablas

1. Ve a **Table Editor** en el menú lateral
2. Deberías ver dos tablas:
   - `profiles` - Perfiles de usuarios con roles
   - `reservas` - Reservas de horarios

## Paso 6: Crear tu Usuario Admin

1. Inicia la aplicación con `npm run dev`
2. Regístrate con tu email y contraseña en la aplicación
3. Vuelve a Supabase, ve a **SQL Editor**
4. Ejecuta esta consulta (reemplaza con tu email):

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'tu-email@ejemplo.com';
```

5. Recarga la aplicación y verás el botón "ADMIN" en el navbar

## Paso 7: Verificar que Todo Funciona

### Prueba como usuario anónimo:
1. Ve a `/reservar`
2. Selecciona un horario
3. Completa el formulario
4. Verifica que se cree la reserva en el calendario

### Prueba como usuario registrado:
1. Inicia sesión
2. Crea una reserva
3. Ve a "MIS RESERVAS" y verifica que veas tu reserva

### Prueba como admin:
1. Inicia sesión con tu usuario admin
2. Haz clic en "ADMIN" en el navbar
3. Verifica que veas todas las reservas
4. Prueba confirmar/rechazar una reserva pendiente

## Estructura de la Base de Datos

### Tabla `profiles`
- `id` (UUID): ID del usuario (FK a auth.users)
- `email` (TEXT): Email del usuario
- `nombre` (TEXT): Nombre del usuario
- `role` (TEXT): 'user' o 'admin'
- `created_at` (TIMESTAMP): Fecha de creación

### Tabla `reservas`
- `id` (UUID): ID de la reserva
- `user_id` (UUID): ID del usuario (NULL para anónimos)
- `nombre` (TEXT): Nombre del cliente
- `telefono` (TEXT): Teléfono del cliente
- `email` (TEXT): Email del cliente
- `dni` (TEXT): DNI del cliente
- `fecha` (DATE): Fecha de la reserva
- `hora` (TEXT): Hora de inicio
- `hora_fin` (TEXT): Hora de fin (NULL para reservas de 1 hora)
- `dia_semana` (TEXT): Día de la semana
- `estado` (TEXT): 'pendiente', 'confirmada', o 'rechazada'
- `notas` (TEXT): Notas adicionales
- `created_at` (TIMESTAMP): Fecha de creación
- `updated_at` (TIMESTAMP): Fecha de última actualización

## Políticas de Seguridad (RLS)

Las políticas de Row Level Security (RLS) configuradas garantizan:

- ✅ Usuarios anónimos pueden crear reservas
- ✅ Usuarios autenticados pueden crear reservas asociadas a su cuenta
- ✅ Todos pueden ver todas las reservas (para el calendario)
- ✅ Los usuarios solo pueden ver/editar/eliminar sus propias reservas en "Mis Reservas"
- ✅ Los admins pueden ver, editar y eliminar cualquier reserva
- ✅ Los admins pueden confirmar/rechazar reservas

## Solución de Problemas

### Error: "Faltan las variables de entorno de Supabase"
- Verifica que el archivo `.env` exista en la raíz del proyecto
- Verifica que las variables comiencen con `VITE_`
- Reinicia el servidor de desarrollo después de modificar `.env`

### Error al ejecutar el SQL
- Verifica que hayas copiado TODO el contenido del archivo `supabase-setup.sql`
- Intenta ejecutar las secciones una por una si hay problemas

### No veo mis reservas
- Verifica que estés autenticado
- Verifica que la reserva tenga tu `user_id` asociado
- Revisa la consola del navegador para ver errores

### No puedo acceder al panel admin
- Verifica que tu usuario tenga `role = 'admin'` en la tabla `profiles`
- Ejecuta la consulta SQL del Paso 6 nuevamente

## Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)

## Soporte

Si tienes problemas con la configuración, revisa:
1. La consola del navegador (F12) para errores de JavaScript
2. Los logs de Supabase en Project Settings > Logs
3. Verifica que las políticas RLS estén habilitadas en ambas tablas
