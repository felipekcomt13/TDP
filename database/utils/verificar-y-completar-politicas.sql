-- ============================================
-- VERIFICAR Y COMPLETAR TODAS LAS POLÍTICAS
-- ============================================

-- ============================================
-- PASO 1: Ver TODAS las políticas actuales
-- ============================================

SELECT
  tablename,
  policyname,
  cmd as comando,
  qual as condicion_using,
  with_check as condicion_with_check
FROM pg_policies
WHERE tablename IN ('profiles', 'reservas')
ORDER BY tablename, cmd, policyname;

-- ============================================
-- PASO 2: Contar políticas por tabla y comando
-- ============================================

SELECT
  tablename,
  cmd,
  COUNT(*) as cantidad_politicas
FROM pg_policies
WHERE tablename IN ('profiles', 'reservas')
GROUP BY tablename, cmd
ORDER BY tablename, cmd;

-- ============================================
-- PASO 3: Verificar políticas DELETE para reservas
-- ============================================

SELECT
  policyname,
  '✅ Existe' as estado
FROM pg_policies
WHERE tablename = 'reservas' AND cmd = 'DELETE';

-- ============================================
-- PASO 4: Corregir políticas DELETE si faltan
-- ============================================

-- Eliminar políticas DELETE antiguas
DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias reservas" ON public.reservas;
DROP POLICY IF EXISTS "Los admins pueden eliminar cualquier reserva" ON public.reservas;

-- Crear políticas DELETE correctas
CREATE POLICY "Usuarios eliminan propias reservas"
  ON public.reservas FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins eliminan todas las reservas"
  ON public.reservas FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ============================================
-- PASO 5: Verificar que is_admin funciona
-- ============================================

-- Probar la función is_admin con tu usuario
SELECT
  id,
  email,
  role,
  public.is_admin(id) as es_admin_test,
  CASE
    WHEN public.is_admin(id) THEN '✅ Función OK'
    ELSE '⚠️ No detecta como admin'
  END as estado
FROM public.profiles
WHERE role = 'admin'
LIMIT 5;

-- ============================================
-- PASO 6: Probar UPDATE manualmente
-- ============================================

-- Ver una reserva pendiente
SELECT
  id,
  nombre,
  estado,
  user_id,
  created_at
FROM public.reservas
WHERE estado = 'pendiente'
ORDER BY created_at DESC
LIMIT 1;

-- IMPORTANTE: Copia el ID de arriba y reemplázalo abajo
-- Luego descomenta y ejecuta este UPDATE para probar:

/*
UPDATE public.reservas
SET estado = 'confirmada'
WHERE id = 'PEGA-EL-ID-AQUI';

-- Si esto funciona, el problema NO es de políticas
-- Si da error, hay un problema con las políticas
*/

-- Verificar el cambio
SELECT
  id,
  nombre,
  estado,
  '✅ Actualizada' as resultado
FROM public.reservas
WHERE id = 'PEGA-EL-MISMO-ID-AQUI';

-- ============================================
-- PASO 7: Verificar estructura de la tabla
-- ============================================

-- Ver columnas de reservas
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'reservas'
ORDER BY ordinal_position;

-- ============================================
-- PASO 8: Ver errores recientes (si los hay)
-- ============================================

-- Este query muestra información del sistema
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE tablename IN ('profiles', 'reservas');

-- ============================================
-- RESUMEN FINAL
-- ============================================

SELECT '======================================' as mensaje
UNION ALL SELECT 'VERIFICACIÓN COMPLETA'
UNION ALL SELECT '======================================'
UNION ALL
SELECT CONCAT(
  '📋 Tabla profiles - Políticas: ',
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles')::text
)
UNION ALL
SELECT CONCAT(
  '📋 Tabla reservas - Políticas: ',
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'reservas')::text
)
UNION ALL
SELECT CONCAT(
  '✅ Función is_admin: ',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin')
    THEN 'Existe' ELSE 'No existe' END
)
UNION ALL
SELECT CONCAT(
  '✅ RLS profiles: ',
  CASE WHEN (SELECT rowsecurity FROM pg_tables WHERE tablename = 'profiles')
    THEN 'Activo' ELSE 'Inactivo' END
)
UNION ALL
SELECT CONCAT(
  '✅ RLS reservas: ',
  CASE WHEN (SELECT rowsecurity FROM pg_tables WHERE tablename = 'reservas')
    THEN 'Activo' ELSE 'Inactivo' END
)
UNION ALL SELECT '======================================';

-- ============================================
-- DIAGNÓSTICO DE PROBLEMAS
-- ============================================

/*
SI EL ERROR PERSISTE DESPUÉS DE ESTE SCRIPT:

1. POLÍTICAS OK PERO ERROR DE CORS:
   - El problema puede ser el navegador cacheando
   - Solución: Modo incógnito o limpiar caché

2. UPDATE FUNCIONA EN SQL PERO NO EN LA APP:
   - Problema con el código JavaScript
   - Revisar ReservasContext.jsx línea 158-172

3. FUNCIÓN is_admin DEVUELVE FALSE:
   - Tu usuario no es admin en profiles
   - Ejecuta: UPDATE profiles SET role = 'admin' WHERE email = 'tu-email';

4. ERROR DIFERENTE AL DE CORS:
   - Copiar el mensaje de error completo
   - Verificar la consola del navegador

PARA DEBUG ADICIONAL:
1. Abre consola del navegador (F12)
2. Ve a Network tab
3. Intenta confirmar una reserva
4. Busca la petición PATCH a "reservas"
5. Click en ella → ve a "Response" tab
6. Copia el mensaje de error y envíalo

POLÍTICA ESPERADA PARA ADMINS:
- Los admins deberían poder hacer UPDATE en CUALQUIER reserva
- La política usa: public.is_admin(auth.uid())
- Esto NO debería causar recursión porque is_admin tiene SECURITY DEFINER
*/
