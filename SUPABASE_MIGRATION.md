# Migración Supabase: Tabla Canchas

Ejecuta este SQL en el **SQL Editor** de Supabase para habilitar la gestión dinámica de canchas.

```sql
-- Crear tabla canchas
CREATE TABLE IF NOT EXISTS canchas (
  id TEXT PRIMARY KEY,                   -- ej: 'principal', 'anexa-1', 'nueva-cancha'
  nombre TEXT NOT NULL,
  foto_url TEXT,
  costo_regular INTEGER NOT NULL DEFAULT 50,
  costo_socio INTEGER,                   -- NULL = sin tarifa diferenciada
  estado TEXT NOT NULL DEFAULT 'disponible'
    CHECK (estado IN ('disponible', 'mantenimiento', 'no_disponible')),
  deportes TEXT[] DEFAULT ARRAY['basket', 'voley']::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE canchas ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer canchas
CREATE POLICY "canchas_select_public" ON canchas
  FOR SELECT USING (true);

-- Solo admins pueden modificar
CREATE POLICY "canchas_admin_insert" ON canchas
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "canchas_admin_update" ON canchas
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "canchas_admin_delete" ON canchas
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Datos iniciales (compatibles con reservas existentes)
INSERT INTO canchas (id, nombre, costo_regular, costo_socio, estado, deportes)
VALUES
  ('principal', 'Cancha Principal', 80, 70, 'disponible', ARRAY['basket', 'voley']),
  ('anexa-1',   'Cancha Anexa 1',  50, 40, 'disponible', ARRAY['basket', 'voley']),
  ('anexa-2',   'Cancha Anexa 2',  50, 40, 'disponible', ARRAY['basket', 'voley'])
ON CONFLICT (id) DO NOTHING;
```

> **Nota:** El campo `id` de la tabla `canchas` corresponde al campo `cancha` de la tabla `reservas`.
> Las canchas existentes ('principal', 'anexa-1', 'anexa-2') son compatibles con todas las reservas históricas.
