# 🎯 Accesos a Gestión de Usuarios - Guía Rápida

## 📍 Ahora Tienes 4 Formas de Acceder a la Gestión de Usuarios

### 1️⃣ Desde el Navbar (Siempre Visible)
```
┌─────────────────────────────────────────────────┐
│  INICIO  RESERVAR  MIS RESERVAS  [ADMIN]  [USUARIOS]  │
│                                     ↑        ↑         │
│                                     │        │         │
│                              Click aquí   o aquí      │
└─────────────────────────────────────────────────┘
```
**Ubicación**: Parte superior de todas las páginas
**Botones**:
- `ADMIN` → Va a /admin (panel de reservas)
- `USUARIOS` → Va a /admin/usuarios (gestión de usuarios) ⭐

---

### 2️⃣ Desde la Página de Inicio (Landing Page)
```
┌─────────────────────────────────────────────────┐
│  BIENVENIDO A TRIPLE DOBLE                      │
│  [Banner Negro - Solo para Admins]              │
│  ┌─────────────────────────────────────────┐   │
│  │ Panel de Administrador                   │   │
│  │ Acceso Rápido a Herramientas            │   │
│  │                                          │   │
│  │  [Gestionar Reservas]  [Gestionar Usuarios] │
│  │                              ↑              │   │
│  │                        Click aquí          │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```
**Ubicación**: Justo debajo del hero section (título principal)
**Cuándo se ve**: Solo si eres administrador
**Color**: Banner negro que resalta

---

### 3️⃣ Desde "Mis Reservas" - Botones Superiores
```
┌─────────────────────────────────────────────────┐
│  MIS RESERVAS                                    │
│                    [Panel Admin] [Gestionar Usuarios]
│                                         ↑             │
│                                   Click aquí         │
│                                                       │
│  [Banner Negro de Admin - Ver explicación abajo]    │
└─────────────────────────────────────────────────┘
```
**Ubicación**: Esquina superior derecha de "Mis Reservas"
**Botones**:
- `Panel Admin` (negro) → Ir a panel de reservas
- `Gestionar Usuarios` (blanco con borde) → Ir a gestión de usuarios ⭐

---

### 4️⃣ Desde "Mis Reservas" - Banner Negro
```
┌─────────────────────────────────────────────────┐
│  MIS RESERVAS                   [botones arriba] │
│                                                   │
│  ┌─────────────────────────────────────────┐    │
│  │ Panel de Administrador                   │    │
│  │ Tienes permisos de administrador...      │    │
│  │                                           │    │
│  │            [Ver Reservas]  [Ver Usuarios] │   │
│  │                                    ↑       │   │
│  │                              Click aquí   │   │
│  └─────────────────────────────────────────┘    │
│                                                   │
│  [Aquí van tus reservas...]                      │
└─────────────────────────────────────────────────┘
```
**Ubicación**: Banner negro debajo del título "Mis Reservas"
**Cuándo se ve**: Solo si eres administrador
**Botones**:
- `Ver Reservas` → Panel admin de reservas
- `Ver Usuarios` → Gestión de usuarios ⭐

---

### 5️⃣ Desde el Panel Admin
```
┌─────────────────────────────────────────────────┐
│  PANEL ADMIN          [Gestionar Usuarios] [🔑Admin]
│                                 ↑                 │
│                           Click aquí             │
│                                                   │
│  Gestiona todas las reservas del complejo       │
└─────────────────────────────────────────────────┘
```
**Ubicación**: Esquina superior derecha del Panel Admin
**Botón**: `Gestionar Usuarios` (blanco con borde)

---

## ✅ Checklist de Verificación

Para verificar que todo funciona:

- [ ] **Paso 1**: Cierra sesión en tu app
- [ ] **Paso 2**: Vuelve a iniciar sesión
- [ ] **Paso 3**: Ve a la página de inicio (/)
- [ ] **Paso 4**: ¿Ves un banner negro con "Panel de Administrador"?
  - ✅ SÍ → Eres admin, continúa
  - ❌ NO → Ejecuta el SQL para hacerte admin

- [ ] **Paso 5**: Ve a "MIS RESERVAS"
- [ ] **Paso 6**: ¿Ves el banner negro de admin?
  - ✅ SÍ → Todo bien
  - ❌ NO → Revisa la consola (F12) para errores

- [ ] **Paso 7**: Haz clic en cualquier botón "Gestionar Usuarios"
- [ ] **Paso 8**: ¿Llegaste a /admin/usuarios?
  - ✅ SÍ → ¡Perfecto! Ya puedes gestionar usuarios
  - ❌ NO → Abre la consola del navegador y envía el error

---

## 🔧 Si Aún No Ves los Botones

### Verificar que Eres Admin

```sql
-- En SQL Editor de Supabase:
SELECT email, nombre, role FROM public.profiles WHERE email = 'tu-email@ejemplo.com';
```

**Resultado esperado**: `role` debe ser `'admin'`

**Si no lo es**, ejecuta:
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'tu-email@ejemplo.com';
```

### Verificar el Navbar

Si ves `ADMIN` pero NO ves `USUARIOS`:
1. Abre la consola del navegador (F12)
2. Refresca la página (Ctrl+R)
3. Busca errores en rojo
4. Si hay error de importación, el servidor no se recargó

**Solución**: Para el servidor y vuelve a iniciar:
```bash
# Ctrl+C para detener
npm run dev
```

### Limpiar Caché del Navegador

A veces el navegador cachea el código viejo:
1. Presiona `Ctrl+Shift+R` (recarga forzada)
2. O abre modo incógnito y prueba ahí

---

## 🎨 Así Se Ve Visualmente

### En la Página de Inicio (si eres admin):
```
┌──────────────────────────────────────────┐
│                                          │
│   COMPLEJO DEPORTIVO TRIPLE DOBLE       │
│   Reserva tu cancha...                  │
│                                          │
├──────────────────────────────────────────┤
│ ████████████████████████████████████████ │ ← Banner Negro
│ █ Panel de Administrador            █  │
│ █ Acceso Rápido...                  █  │
│ █                                   █  │
│ █  [Gestionar Reservas] [Gestionar Usuarios] █
│ ████████████████████████████████████████ │
├──────────────────────────────────────────┤
│                                          │
│   CÓMO RESERVAR                         │
│   1. Elige tu horario...                │
└──────────────────────────────────────────┘
```

### En Mis Reservas (si eres admin):
```
┌──────────────────────────────────────────┐
│ MIS RESERVAS                             │
│           [Panel Admin] [Gestionar Usuarios] ← Botones arriba
├──────────────────────────────────────────┤
│ ████████████████████████████████████████ │ ← Banner Negro
│ █ Panel de Administrador            █  │
│ █ Tienes permisos...                █  │
│ █                                   █  │
│ █     [Ver Reservas] [Ver Usuarios] █  │
│ ████████████████████████████████████████ │
├──────────────────────────────────────────┤
│                                          │
│ 📋 Tus Reservas:                        │
│ [Lista de reservas aquí...]             │
└──────────────────────────────────────────┘
```

---

## 🚀 URL Directa

También puedes acceder directamente escribiendo en la barra del navegador:

```
http://localhost:5174/admin/usuarios
```

**Nota**: Si no eres admin, serás redirigido automáticamente a la página de inicio.

---

## 📱 Resumen Visual de Accesos

```
Tu App
├── Navbar (siempre visible)
│   ├── ADMIN → /admin
│   └── USUARIOS → /admin/usuarios ⭐⭐⭐
│
├── Página de Inicio (/)
│   └── Banner Negro Admin
│       └── [Gestionar Usuarios] ⭐⭐
│
├── Mis Reservas (/reservas)
│   ├── Botones superiores
│   │   └── [Gestionar Usuarios] ⭐⭐
│   └── Banner Negro
│       └── [Ver Usuarios] ⭐
│
└── Panel Admin (/admin)
    └── Botón superior
        └── [Gestionar Usuarios] ⭐
```

**Leyenda**:
- ⭐⭐⭐ = Acceso principal (más visible)
- ⭐⭐ = Acceso secundario (muy visible)
- ⭐ = Acceso alternativo

---

## ✨ ¡Ahora Tienes 5+ Formas de Acceder!

Ya no hay excusa para no encontrar la gestión de usuarios. Está en:
1. ✅ Navbar → Botón `USUARIOS`
2. ✅ Landing → Banner negro con botón
3. ✅ Mis Reservas → Botones superiores
4. ✅ Mis Reservas → Banner negro
5. ✅ Panel Admin → Botón superior
6. ✅ URL directa → /admin/usuarios

---

## 🎯 Próximo Paso

1. Actualiza la página (F5) o recarga el servidor
2. Ve a cualquiera de las ubicaciones de arriba
3. Haz clic en "Gestionar Usuarios"
4. ¡Deberías ver la página con la lista de usuarios!

¿Funcionó? Si no, dime qué ves en la consola del navegador (F12).
