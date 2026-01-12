# 👑 Instrucciones para Convertirte en Admin y Gestionar Usuarios

## 🎯 Resumen

Has agregado con éxito la funcionalidad de gestión de usuarios. Ahora los administradores pueden:
- ✅ Ver todos los usuarios del sistema
- ✅ Promover usuarios a administradores
- ✅ Quitar permisos de administrador
- ✅ Buscar usuarios por email o nombre

---

## 📋 Paso 1: Convertirte en Admin (Primera Vez)

### Opción A: Usando SQL (Recomendado)

1. **Inicia tu aplicación** para crear tu usuario:
   ```bash
   npm run dev
   ```

2. **Regístrate** en http://localhost:5173/login
   - Completa el formulario de registro
   - Usa tu email y una contraseña segura

3. **Ve a Supabase** → **SQL Editor**

4. **Ejecuta este script** (reemplaza con tu email):
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE email = 'tu-email@ejemplo.com';
   ```

5. **Verifica el cambio**:
   ```sql
   SELECT email, nombre, role FROM public.profiles WHERE role = 'admin';
   ```

6. **Cierra sesión y vuelve a iniciar** en la app para ver los cambios

### Opción B: Crear Usuario Admin Directamente

Si no puedes registrarte por el error 429:

1. Ve a **Authentication** → **Users** en Supabase
2. Haz clic en **Add user** → **Create new user**
3. Completa:
   - Email: tu-email@ejemplo.com
   - Password: tu-contraseña (mín. 6 caracteres)
   - ✅ Auto Confirm User: Actívalo
4. Haz clic en **Create user**
5. Ejecuta el SQL del Paso 1.4 para hacerlo admin

---

## 🔧 Paso 2: Actualizar Políticas de Supabase

**IMPORTANTE**: Para que los admins puedan cambiar roles, ejecuta este script:

1. Ve a **SQL Editor** en Supabase
2. Abre el archivo `actualizar-politicas-admin.sql` del proyecto
3. Copia **TODO** el contenido
4. Pégalo en el SQL Editor
5. Haz clic en **Run**
6. Verifica que no haya errores

**¿Qué hace este script?**
- Permite que los admins puedan actualizar roles de otros usuarios
- Impide que usuarios normales se hagan admin a sí mismos
- Configura las políticas de seguridad (RLS) correctamente

---

## 🎮 Paso 3: Usar la Gestión de Usuarios

### Acceder al Panel

Como admin, verás dos nuevas opciones en el navbar:
- **ADMIN** - Panel de reservas
- **USUARIOS** - Gestión de usuarios (nuevo)

### Hacer a Alguien Admin

1. Haz clic en **USUARIOS** en el navbar
2. Busca el usuario que quieres promover
3. Haz clic en **HACER ADMIN**
4. El usuario ahora es administrador
5. El usuario debe cerrar sesión y volver a entrar para ver los cambios

### Quitar Permisos de Admin

1. Ve a **USUARIOS**
2. Encuentra el usuario admin
3. Haz clic en **QUITAR ADMIN**
4. El usuario vuelve a ser usuario normal

---

## 🔍 Paso 4: Verificar que Todo Funciona

### Test 1: Verificar tu Rol Admin
```bash
# En la app:
1. Inicia sesión con tu usuario
2. Verifica que veas "ADMIN" y "USUARIOS" en el navbar
3. Ve a /admin/usuarios
4. Deberías ver la lista de usuarios
```

### Test 2: Cambiar Rol de un Usuario
```bash
1. Crea un segundo usuario (o pide a alguien que se registre)
2. Ve a /admin/usuarios
3. Haz clic en "HACER ADMIN" en ese usuario
4. Verifica en Supabase que el cambio se aplicó:
   SELECT email, role FROM profiles;
```

### Test 3: Verificar Políticas
```sql
-- En SQL Editor de Supabase:
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- Deberías ver al menos 4 políticas
```

---

## 📊 Estructura de la Funcionalidad

### Archivos Creados

```
src/pages/
└── GestionUsuarios.jsx     # Página de gestión de usuarios

Raíz del proyecto/
├── crear-primer-admin.sql            # Script para crear el primer admin
├── actualizar-politicas-admin.sql    # Script para las políticas RLS
└── INSTRUCCIONES_ADMIN.md            # Este archivo
```

### Archivos Modificados

```
src/
├── App.jsx                           # Agregada ruta /admin/usuarios
├── components/Navbar.jsx             # Agregado botón USUARIOS
└── pages/AdminPanel.jsx              # Agregado botón de gestión
```

---

## 🎨 Características de la Página de Gestión

### Estadísticas
- Total de usuarios
- Total de administradores
- Total de usuarios normales

### Búsqueda
- Buscar por email
- Buscar por nombre
- Filtrado en tiempo real

### Acciones
- Promover a admin (botón negro)
- Quitar admin (botón blanco)
- Feedback visual de cambios

### Seguridad
- Solo accesible para admins
- Protegido con ProtectedRoute
- Validación en el backend con RLS

---

## ⚠️ Solución de Problemas

### No veo el botón "USUARIOS"

**Causa**: No eres administrador

**Solución**:
```sql
-- Verifica tu rol:
SELECT email, role FROM profiles WHERE email = 'tu-email@ejemplo.com';

-- Si muestra 'user', ejecuta:
UPDATE profiles SET role = 'admin' WHERE email = 'tu-email@ejemplo.com';

-- Cierra sesión y vuelve a iniciar
```

### Error: "permission denied for table profiles"

**Causa**: Las políticas RLS no están configuradas

**Solución**:
1. Ejecuta `actualizar-politicas-admin.sql` en SQL Editor
2. Verifica que RLS esté habilitado:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'profiles';
   ```

### Los cambios no se reflejan

**Causa**: El usuario no ha recargado la sesión

**Solución**:
- El usuario afectado debe cerrar sesión
- Volver a iniciar sesión
- Ahora verá sus nuevos permisos

### No puedo cambiar mi propio rol

**Causa**: Comportamiento esperado por seguridad

**Solución**:
- Los usuarios no pueden cambiar su propio rol (ni siquiera admins)
- Si necesitas cambiar tu rol, usa SQL:
  ```sql
  UPDATE profiles SET role = 'admin' WHERE email = 'tu-email@ejemplo.com';
  ```

---

## 🔐 Seguridad

### Políticas Implementadas

1. **Usuarios normales**:
   - Solo pueden ver su propio perfil
   - Solo pueden actualizar su nombre/email
   - NO pueden cambiar roles

2. **Administradores**:
   - Pueden ver todos los perfiles
   - Pueden actualizar cualquier perfil
   - Pueden cambiar roles de otros usuarios
   - NO pueden cambiar su propio rol desde la app

3. **Row Level Security (RLS)**:
   - Todas las políticas están en la base de datos
   - No se puede saltear con llamadas API
   - Protección a nivel de PostgreSQL

---

## 🚀 Flujo Completo de Uso

### Para el Primer Admin (Tú)

```
1. Registrarte en la app
   ↓
2. Ejecutar SQL para hacerte admin
   ↓
3. Ejecutar SQL de políticas
   ↓
4. Cerrar sesión y volver a entrar
   ↓
5. Verificar que ves ADMIN y USUARIOS
   ↓
6. ¡Listo! Ahora puedes gestionar usuarios
```

### Para Promover a Otros Usuarios

```
1. Ellos se registran normalmente
   ↓
2. Tú vas a /admin/usuarios
   ↓
3. Buscas al usuario
   ↓
4. Click en "HACER ADMIN"
   ↓
5. Ellos cierran sesión y vuelven a entrar
   ↓
6. ¡Ya son admins!
```

---

## 📚 Recursos

### Scripts SQL Útiles

**Ver todos los admins**:
```sql
SELECT email, nombre, role, created_at
FROM profiles
WHERE role = 'admin'
ORDER BY created_at;
```

**Ver todos los usuarios**:
```sql
SELECT
  email,
  nombre,
  role,
  created_at,
  CASE
    WHEN role = 'admin' THEN '👑 Admin'
    ELSE '👤 Usuario'
  END as tipo
FROM profiles
ORDER BY role DESC, created_at DESC;
```

**Contar usuarios por rol**:
```sql
SELECT
  role,
  COUNT(*) as cantidad
FROM profiles
GROUP BY role;
```

---

## ✅ Checklist Final

Antes de usar en producción, verifica:

- [ ] Has ejecutado `crear-primer-admin.sql`
- [ ] Has ejecutado `actualizar-politicas-admin.sql`
- [ ] Ves el botón "USUARIOS" en el navbar
- [ ] Puedes acceder a /admin/usuarios
- [ ] Puedes cambiar el rol de otros usuarios
- [ ] Los cambios se reflejan en Supabase
- [ ] Las políticas RLS están activas
- [ ] Has probado con un usuario de prueba

---

## 🎉 ¡Listo!

Ahora tienes un sistema completo de gestión de usuarios con:
- Roles (user/admin)
- Panel de administración
- Cambio de roles desde la interfaz
- Seguridad con RLS

¿Necesitas más ayuda? Revisa:
- `TROUBLESHOOTING.md` - Solución de problemas
- `SUPABASE_SETUP.md` - Configuración de Supabase
- `README.md` - Documentación general
