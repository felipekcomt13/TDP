-- ============================================
-- MIGRACIÓN: AGREGAR SISTEMA DE MÚLTIPLES CANCHAS
-- ============================================
-- Este script agrega soporte para 3 canchas:
-- - 1 Cancha Principal
-- - 2 Canchas Anexas (Anexa 1 y Anexa 2)
--
-- Reglas de bloqueo:
-- - Si Principal está reservada → Anexa 1 y Anexa 2 se bloquean
-- - Si Anexa 1 o Anexa 2 están reservadas → Principal se bloquea
-- - Anexa 1 y Anexa 2 NO se bloquean entre sí

-- 1. Agregar columna 'cancha' a la tabla reservas
ALTER TABLE public.reservas
ADD COLUMN IF NOT EXISTS cancha TEXT NOT NULL DEFAULT 'principal'
CHECK (cancha IN ('principal', 'anexa-1', 'anexa-2'));

-- 2. Actualizar reservas existentes (si las hay) para asignarles cancha principal
UPDATE public.reservas
SET cancha = 'principal'
WHERE cancha IS NULL;

-- 3. Crear índice para mejorar el rendimiento de búsquedas por cancha
CREATE INDEX IF NOT EXISTS idx_reservas_cancha ON public.reservas(cancha);

-- 4. Crear índice compuesto para búsquedas de disponibilidad
CREATE INDEX IF NOT EXISTS idx_reservas_fecha_hora_cancha
ON public.reservas(fecha, hora, cancha);

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Para verificar que la migración funcionó correctamente:
-- SELECT cancha, COUNT(*) FROM public.reservas GROUP BY cancha;

-- ============================================
-- MIGRACIÓN COMPLETADA
-- ============================================
-- Ejecuta este script en Supabase SQL Editor
-- Después, verifica que la columna 'cancha' se agregó correctamente
