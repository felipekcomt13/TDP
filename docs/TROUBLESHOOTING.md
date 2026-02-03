# Solución de Problemas Comunes

## Error 429: Too Many Requests al Crear Cuenta

### Síntoma
```
POST https://[tu-proyecto].supabase.co/auth/v1/signup 429 (Too Many Requests)
```

### Causas
1. **Rate limiting de Supabase**: El tier gratuito limita las solicitudes por hora
2. **Email confirmation habilitado**: Cada intento de registro envía un email
3. **Intentos múltiples**: Demasiados intentos desde la misma IP

### Soluciones

#### Opción 1: Desactivar Email Confirmation (Recomendado para Desarrollo)

1. Ve a tu proyecto en Supabase
2. Navega a **Authentication** → **Providers** → **Email**
3. **Desactiva** la opción "**Confirm email**"
4. Desactiva también "**Secure email change**" si está activado
5. Haz clic en **Save**
6. Espera 5 minutos antes de intentar registrarte nuevamente

#### Opción 2: Usar el SQL Editor para Crear Usuarios Manualmente

Si necesitas crear un usuario urgentemente:

```sql
-- 1. Inserta directamente en la tabla profiles
INSERT INTO public.profiles (id, email, nombre, role)
VALUES (
  gen_random_uuid(),
  'tu-email@ejemplo.com',
  'Tu Nombre',
  'user'  -- o 'admin' si quieres ser administrador
);

-- 2. Nota: Este usuario NO podrá iniciar sesión porque no existe en auth.users
-- Solo usa esto para pruebas de visualización
```

Para crear un usuario completo que pueda iniciar sesión, es mejor usar el Dashboard de Supabase:
1. Ve a **Authentication** → **Users**
2. Haz clic en **Add user** → **Create new user**
3. Ingresa email y contraseña
4. El perfil se creará automáticamente con el trigger

#### Opción 3: Esperar y Reintentar

El rate limit se resetea después de un tiempo:
- **Rate limit por IP**: ~10 minutos
- **Rate limit por email**: ~1 hora
- **Rate limit global**: ~24 horas

### Prevención

#### 1. Configurar Rate Limits en Supabase

1. Ve a **Project Settings** → **API**
2. Revisa la sección de **Rate Limiting**
3. Ajusta según tus necesidades (solo en planes pagos)

#### 2. Usar Auto-confirm Email en Desarrollo

En el SQL Editor, ejecuta:

```sql
-- Configurar auto-confirm para desarrollo
-- ADVERTENCIA: Solo usar en desarrollo, no en producción
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;
```

## Error: "Faltan las variables de entorno de Supabase"

### Síntoma
Mensaje de error en la consola al iniciar la app.

### Solución

1. Verifica que el archivo `.env` existe en la raíz del proyecto
2. Verifica que las variables comienzan con `VITE_`:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu_anon_key
   ```
3. Reinicia el servidor de desarrollo:
   ```bash
   # Detén el servidor (Ctrl+C)
   npm run dev
   ```

## No Puedo Ver Mis Reservas

### Síntoma
La página "Mis Reservas" está vacía aunque he creado reservas.

### Causas y Soluciones

#### 1. No Estás Autenticado
- Verifica que veas tu nombre en el navbar (arriba a la derecha)
- Si no estás logueado, ve a `/login` e inicia sesión

#### 2. Las Reservas No Están Asociadas a Tu Usuario
Esto ocurre si:
- Creaste las reservas antes de implementar Supabase
- Creaste las reservas sin estar logueado

**Solución**: Las reservas creadas sin login no se pueden asociar retroactivamente. Crea nuevas reservas estando logueado.

#### 3. Problemas con RLS

Verifica las políticas en Supabase:

```sql
-- Verifica que puedes ver tus propias reservas
SELECT * FROM reservas WHERE user_id = auth.uid();

-- Si esto no devuelve nada pero sí hay reservas, verifica las políticas RLS:
SELECT * FROM pg_policies WHERE tablename = 'reservas';
```

## No Veo el Botón "ADMIN"

### Síntoma
He iniciado sesión pero no veo el botón "ADMIN" en el navbar.

### Solución

Verifica tu rol en Supabase:

```sql
-- Ver tu rol actual
SELECT id, email, role FROM profiles WHERE email = 'tu-email@ejemplo.com';

-- Si el resultado muestra role = 'user', cámbialo a 'admin':
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'tu-email@ejemplo.com';
```

Luego:
1. Recarga la página (F5)
2. Si aún no aparece, cierra sesión y vuelve a iniciar

## Error al Crear Reservas

### Síntoma
"Error al crear la reserva" o la reserva no aparece en el calendario.

### Diagnóstico

Abre la consola del navegador (F12) y busca errores. Los más comunes:

#### 1. Error: "permission denied for table reservas"

Las políticas RLS están bloqueando la inserción.

**Solución**: Verifica que la política "Usuarios anónimos pueden crear reservas" existe:

```sql
-- Ver políticas
SELECT * FROM pg_policies WHERE tablename = 'reservas' AND policyname LIKE '%crear%';

-- Si no existe, ejecuta de nuevo la parte relevante de supabase-setup.sql
```

#### 2. Error: "null value in column 'nombre' violates not-null constraint"

Hay un problema con el formulario.

**Solución**: Verifica que todos los campos obligatorios estén llenos:
- Nombre
- DNI
- Al menos uno: teléfono o email

## Las Reservas No Se Actualizan en Tiempo Real

### Síntoma
Creas una reserva pero no aparece hasta que recargas la página.

### Solución

1. Verifica que Realtime esté habilitado en Supabase:
   - Ve a **Database** → **Replication**
   - Verifica que la tabla `reservas` esté en la lista
   - Si no está, agrégala

2. Si el problema persiste, verifica la consola:
   ```javascript
   // Deberías ver mensajes de conexión de Realtime
   ```

## Error al Ejecutar el SQL Script

### Síntoma
Errores al ejecutar `supabase-setup.sql` en el SQL Editor.

### Soluciones Según el Error

#### "relation 'profiles' already exists"
La tabla ya existe. Puedes:
- Saltarte la creación de esa tabla
- O eliminarla primero: `DROP TABLE IF EXISTS profiles CASCADE;`

#### "function handle_new_user() already exists"
La función ya existe. Usa:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
-- resto del código...
```

#### "permission denied"
No tienes permisos suficientes. Verifica que estés usando el owner de la base de datos en Supabase (por defecto, lo estás).

## Credenciales de Supabase Inválidas

### Síntoma
```
Error: Invalid API key
```

### Solución

1. Verifica que estés usando la **anon/public key**, NO la service_role key
2. Ve a **Project Settings** → **API**
3. Copia nuevamente la "anon" key
4. Actualiza el archivo `.env`:
   ```env
   VITE_SUPABASE_ANON_KEY=eyJhbG...tu_anon_key_completa
   ```
5. Reinicia el servidor

## El Trigger No Crea Perfiles Automáticamente

### Síntoma
Los usuarios se crean en `auth.users` pero no en `profiles`.

### Diagnóstico

```sql
-- Verifica que el trigger existe
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Verifica que la función existe
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'handle_new_user';
```

### Solución

Re-ejecuta la sección del trigger en `supabase-setup.sql`:

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Luego ejecuta de nuevo la función y el trigger del script
```

## Ayuda Adicional

Si ninguna de estas soluciones funciona:

1. **Revisa los logs de Supabase**:
   - Ve a **Project Logs** en el dashboard
   - Filtra por errores

2. **Revisa la consola del navegador** (F12):
   - Busca errores en rojo
   - Busca advertencias en amarillo

3. **Verifica la estructura de la base de datos**:
   ```sql
   -- Ver todas las tablas
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';

   -- Ver columnas de reservas
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'reservas';
   ```

4. **Contacta al soporte**:
   - [Documentación de Supabase](https://supabase.com/docs)
   - [Discord de Supabase](https://discord.supabase.com)
   - [GitHub Issues](https://github.com/supabase/supabase/issues)
