-- Migración: Agregar columna 'deporte' a la tabla reservas
-- Fecha: 2025-01-19
-- Descripción: Permite especificar si la reserva es para básquet o vóley

-- Agregar columna 'deporte' con valor por defecto 'basket'
-- Valores permitidos: 'basket', 'voley'
ALTER TABLE public.reservas
ADD COLUMN IF NOT EXISTS deporte TEXT NOT NULL DEFAULT 'basket'
CHECK (deporte IN ('basket', 'voley'));

-- Crear índice para búsquedas por deporte
CREATE INDEX IF NOT EXISTS idx_reservas_deporte
ON public.reservas(deporte);

-- Comentario de la columna para documentación
COMMENT ON COLUMN public.reservas.deporte IS 'Deporte de la reserva: basket o voley';

-- Verificar que se haya agregado correctamente
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'reservas' AND column_name = 'deporte';
