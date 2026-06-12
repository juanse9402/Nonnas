-- Tabla para la fórmula médica del paciente
CREATE TABLE medicamentos_paciente (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  medicamento_nombre text NOT NULL,
  presentacion text NOT NULL,
  dosis text NOT NULL,
  horarios text[] NOT NULL, -- Array de horas, ej: ['08:00', '20:00']
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE medicamentos_paciente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura de medicamentos a autenticados" ON medicamentos_paciente FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir escritura de medicamentos a autenticados" ON medicamentos_paciente FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir actualización de medicamentos a autenticados" ON medicamentos_paciente FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Permitir eliminación de medicamentos a autenticados" ON medicamentos_paciente FOR DELETE TO authenticated USING (true);


-- Tabla para el registro de entregas (si no existe)
CREATE TABLE IF NOT EXISTS registro_medicamentos_entregados (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  turno_id uuid REFERENCES turnos_cronograma(id) ON DELETE SET NULL,
  paciente_id uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  medicamento_nombre text NOT NULL,
  hora_programada text NOT NULL,
  entregado boolean DEFAULT true,
  entregado_por uuid NOT NULL REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE registro_medicamentos_entregados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura de entregas a autenticados" ON registro_medicamentos_entregados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir escritura de entregas a autenticados" ON registro_medicamentos_entregados FOR INSERT TO authenticated WITH CHECK (true);
