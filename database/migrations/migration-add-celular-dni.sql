-- Agregar columnas a profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS celular VARCHAR(9);

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS dni VARCHAR(8);

-- Restricción de unicidad para DNI
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_dni_unique UNIQUE (dni);

-- Actualizar trigger para incluir nuevos campos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, celular, dni, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'celular',
    new.raw_user_meta_data->>'dni',
    'user'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
