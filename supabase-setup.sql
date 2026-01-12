-- ============================================
-- CONFIGURACIÓN DE SUPABASE
-- Sistema de Gestión de Horarios - Cancha de Basket
-- ============================================

-- Este script debe ejecutarse en el SQL Editor de Supabase
-- Para acceder: https://app.supabase.com/project/_/sql

-- ============================================
-- 1. TABLA DE PERFILES
-- ============================================

-- Crear tabla de perfiles de usuarios
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  nombre TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Los usuarios pueden ver su propio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Los usuarios pueden actualizar su propio perfil (excepto el role)
CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Los admins pueden ver todos los perfiles
CREATE POLICY "Los admins pueden ver todos los perfiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)), 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para ejecutar la función al crear un usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. TABLA DE RESERVAS
-- ============================================

-- Crear tabla de reservas
CREATE TABLE IF NOT EXISTS public.reservas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  dni TEXT NOT NULL,
  fecha DATE NOT NULL,
  hora TEXT NOT NULL,
  hora_fin TEXT,
  dia_semana TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'rechazada')),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_reservas_user_id ON public.reservas(user_id);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha ON public.reservas(fecha);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON public.reservas(estado);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. POLÍTICAS RLS PARA RESERVAS
-- ============================================

-- Política 1: Usuarios anónimos pueden INSERTAR reservas (user_id será NULL)
CREATE POLICY "Usuarios anónimos pueden crear reservas"
  ON public.reservas FOR INSERT
  WITH CHECK (true);

-- Política 2: Usuarios autenticados pueden INSERTAR sus propias reservas
CREATE POLICY "Usuarios autenticados pueden crear reservas"
  ON public.reservas FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Política 3: Todos pueden VER todas las reservas (para mostrar en el calendario)
-- Esto permite que el calendario muestre la disponibilidad sin filtrar por usuario
CREATE POLICY "Todos pueden ver todas las reservas"
  ON public.reservas FOR SELECT
  USING (true);

-- Política 4: Los usuarios pueden ACTUALIZAR solo sus propias reservas
CREATE POLICY "Los usuarios pueden actualizar sus propias reservas"
  ON public.reservas FOR UPDATE
  USING (auth.uid() = user_id);

-- Política 5: Los usuarios pueden ELIMINAR solo sus propias reservas
CREATE POLICY "Los usuarios pueden eliminar sus propias reservas"
  ON public.reservas FOR DELETE
  USING (auth.uid() = user_id);

-- Política 6: Los admins pueden ACTUALIZAR cualquier reserva
CREATE POLICY "Los admins pueden actualizar cualquier reserva"
  ON public.reservas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política 7: Los admins pueden ELIMINAR cualquier reserva
CREATE POLICY "Los admins pueden eliminar cualquier reserva"
  ON public.reservas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 4. FUNCIÓN PARA ACTUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS on_reserva_updated ON public.reservas;
CREATE TRIGGER on_reserva_updated
  BEFORE UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 5. DATOS DE PRUEBA (OPCIONAL)
-- ============================================

-- Descomentar las siguientes líneas si quieres agregar datos de prueba

-- INSERT INTO public.reservas (nombre, telefono, email, dni, fecha, hora, dia_semana, estado, notas)
-- VALUES
--   ('Juan Pérez', '999888777', 'juan@example.com', '12345678', '2026-01-15', '09:00', 'Miércoles', 'confirmada', 'Reserva de prueba'),
--   ('María García', '999777666', 'maria@example.com', '87654321', '2026-01-15', '14:00', 'Miércoles', 'pendiente', NULL),
--   ('Carlos López', '999666555', 'carlos@example.com', '11223344', '2026-01-16', '10:00', 'Jueves', 'confirmada', NULL);

-- ============================================
-- 6. CÓMO CREAR UN USUARIO ADMIN
-- ============================================

-- Para convertir un usuario en administrador, ejecuta esta consulta
-- reemplazando 'email@del-usuario.com' con el email del usuario que quieres hacer admin:

-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE email = 'email@del-usuario.com';

-- ============================================
-- CONFIGURACIÓN COMPLETADA
-- ============================================

-- Una vez ejecutado este script:
-- 1. Copia tu VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY desde:
--    Project Settings > API > Project URL y anon/public key
-- 2. Pégalos en tu archivo .env
-- 3. Ejecuta npm run dev para iniciar la aplicación
-- 4. Regístrate con tu email para crear un usuario
-- 5. Ejecuta la consulta del punto 6 para convertirte en admin

-- ¡Listo! Tu sistema de reservas está configurado.
