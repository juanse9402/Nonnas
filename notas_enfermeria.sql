-- Crea la tabla para las notas de enfermería (diario por hora)
CREATE TABLE notas_enfermeria (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  auxiliar_id uuid NOT NULL REFERENCES profiles(id),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  hora time NOT NULL,
  observacion text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE notas_enfermeria ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso para usuarios autenticados
CREATE POLICY "Permitir lectura a usuarios autenticados" 
ON notas_enfermeria FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir inserción a usuarios autenticados" 
ON notas_enfermeria FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Permitir actualización a usuarios autenticados" 
ON notas_enfermeria FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Permitir eliminación a usuarios autenticados" 
ON notas_enfermeria FOR DELETE 
TO authenticated 
USING (true);
