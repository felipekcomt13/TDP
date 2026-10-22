-- ============================================
-- MIGRACION: Seguridad de lectura + anti-solapamiento de reservas
-- ============================================
-- Corrige dos problemas:
--
-- 1. La política "Todos pueden ver todas las reservas" (USING true) permitía
--    que cualquiera con la anon key (publica en el bundle del frontend)
--    descargara nombre, DNI, teléfono y email de TODAS las reservas,
--    sin necesidad de login. Se reemplaza por: cada usuario ve solo las
--    suyas, y admin/empleado ven todas.
--
-- 2. La disponibilidad de horarios (para el calendario y el wizard de
--    reserva) necesita que cualquiera -con o sin sesión- pueda consultarla,
--    pero sin exponer datos personales. Se agrega una función RPC que
--    devuelve solo fecha/hora/cancha/deporte de reservas CONFIRMADAS.
--
-- 3. Hasta ahora la única validación de "no dos reservas a la misma hora en
--    la misma cancha" vivía en el navegador (ReservasContext.jsx). Dos
--    confirmaciones simultáneas (dos pestañas de admin, o un bug futuro en
--    el frontend) podían crear un choque real sin que nada lo impidiera.
--    Se agrega una restricción a nivel de base de datos (EXCLUDE constraint)
--    que lo impide siempre, sin importar por dónde se intente.
-- ============================================

-- ============================================
-- 1. RESTRINGIR LECTURA DE public.reservas
-- ============================================

DROP POLICY IF EXISTS "Todos pueden ver todas las reservas" ON public.reservas;

DROP POLICY IF EXISTS "Usuarios ven sus propias reservas" ON public.reservas;
CREATE POLICY "Usuarios ven sus propias reservas"
  ON public.reservas FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins ven todas las reservas" ON public.reservas;
CREATE POLICY "Admins ven todas las reservas"
  ON public.reservas FOR SELECT
  USING (public.is_admin(auth.uid()));

-- ============================================
-- 2. DISPONIBILIDAD PUBLICA (sin datos personales)
-- ============================================
-- El calendario y el wizard de reserva solo necesitan saber qué horarios
-- están ocupados; nunca necesitaron ver nombre/DNI/teléfono/email de nadie.
-- Esta función devuelve lo mínimo indispensable y está abierta a anon.

CREATE OR REPLACE FUNCTION public.obtener_disponibilidad()
RETURNS TABLE (
  fecha date,
  hora text,
  hora_fin text,
  cancha text,
  deporte text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fecha, hora, hora_fin, cancha, deporte
  FROM public.reservas
  WHERE estado = 'confirmada'
    AND fecha >= (CURRENT_DATE - INTERVAL '1 day');
$$;

GRANT EXECUTE ON FUNCTION public.obtener_disponibilidad() TO anon, authenticated;

-- ============================================
-- 3. ANTI-SOLAPAMIENTO A NIVEL DE BASE DE DATOS
-- ============================================
-- Reglas de bloqueo reales (ver migration-add-canchas.sql):
--   - La cancha "principal" ocupa físicamente las dos medias canchas
--     (anexa-1 Y anexa-2) a la vez.
--   - anexa-1 y anexa-2 son independientes entre sí (no se bloquean).
-- Se modela con las 2 medias canchas reales como recurso, y una fila de
-- ocupación por cada media cancha que la reserva confirmada efectivamente
-- usa. El EXCLUDE constraint impide que 2 filas con la misma media cancha,
-- misma fecha y un rango horario que se solape, coexistan.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS public.reservas_ocupacion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reserva_id UUID NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  subcancha TEXT NOT NULL CHECK (subcancha IN ('anexa-1', 'anexa-2')),
  fecha DATE NOT NULL,
  rango TSRANGE NOT NULL
);

ALTER TABLE public.reservas_ocupacion DROP CONSTRAINT IF EXISTS reservas_ocupacion_no_solape;
ALTER TABLE public.reservas_ocupacion
  ADD CONSTRAINT reservas_ocupacion_no_solape
  EXCLUDE USING gist (subcancha WITH =, fecha WITH =, rango WITH &&);

CREATE INDEX IF NOT EXISTS idx_reservas_ocupacion_reserva_id ON public.reservas_ocupacion(reserva_id);

-- Tabla interna de contabilidad: nadie accede a ella directo vía API/REST,
-- solo la mantiene el trigger de abajo (SECURITY DEFINER).
ALTER TABLE public.reservas_ocupacion ENABLE ROW LEVEL SECURITY;

-- Convierte 'HH:MI' en un timestamp real sumando horas/minutos a la
-- medianoche de la fecha. Admite horas >= 24 (p. ej. "25:00" = 1am del
-- día siguiente), que es como esta app representa el cierre de madrugada.
CREATE OR REPLACE FUNCTION public.hora_a_timestamp(p_fecha DATE, p_hora TEXT)
RETURNS TIMESTAMP
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_fecha::timestamp
    + (split_part(p_hora, ':', 1)::int || ' hours')::interval
    + (split_part(p_hora, ':', 2)::int || ' minutes')::interval;
$$;

CREATE OR REPLACE FUNCTION public.sync_reservas_ocupacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio TIMESTAMP;
  v_fin TIMESTAMP;
  v_subcanchas TEXT[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.reservas_ocupacion WHERE reserva_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Recalcular desde cero las filas de esta reserva (cubre INSERT y UPDATE:
  -- cambio de hora, cancha, fecha o estado)
  DELETE FROM public.reservas_ocupacion WHERE reserva_id = NEW.id;

  IF NEW.estado = 'confirmada' THEN
    v_inicio := public.hora_a_timestamp(NEW.fecha, NEW.hora);
    v_fin := CASE
      WHEN NEW.hora_fin IS NOT NULL THEN public.hora_a_timestamp(NEW.fecha, NEW.hora_fin)
      ELSE v_inicio + INTERVAL '1 hour'
    END;

    v_subcanchas := CASE NEW.cancha
      WHEN 'principal' THEN ARRAY['anexa-1', 'anexa-2']
      ELSE ARRAY[NEW.cancha]
    END;

    INSERT INTO public.reservas_ocupacion (reserva_id, subcancha, fecha, rango)
    SELECT NEW.id, s, NEW.fecha, tsrange(v_inicio, v_fin, '[)')
    FROM unnest(v_subcanchas) AS s;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_reservas_ocupacion ON public.reservas;
CREATE TRIGGER trg_sync_reservas_ocupacion
  AFTER INSERT OR UPDATE OR DELETE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.sync_reservas_ocupacion();

-- Backfill: recalcula la ocupación de las reservas confirmadas que ya
-- existían antes de esta migración. Si alguna ya estaba solapada con otra
-- (por un bug previo), se avisa con WARNING en vez de abortar todo el backfill.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.reservas WHERE estado = 'confirmada' ORDER BY created_at LOOP
    BEGIN
      UPDATE public.reservas SET updated_at = updated_at WHERE id = r.id;
    EXCEPTION WHEN exclusion_violation THEN
      RAISE WARNING 'Reserva % no se pudo registrar en reservas_ocupacion: se solapa con otra reserva confirmada ya existente. Revisar manualmente.', r.id;
    END;
  END LOOP;
END $$;

SELECT 'Migracion seguridad-reservas completada' as estado;
