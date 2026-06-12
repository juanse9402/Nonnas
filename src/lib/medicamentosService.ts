import { supabase } from "./supabaseClient";

export type MedicamentoPaciente = {
  id: string;
  paciente_id: string;
  medicamento_nombre: string;
  presentacion: string;
  dosis: string;
  horarios: string[];
  activo: boolean;
};

export type RegistroMedicamento = {
  id: string;
  turno_id: string;
  paciente_id: string;
  medicamento_nombre: string;
  hora_programada: string;
  entregado: boolean;
  entregado_por: string;
  created_at: string;
  profiles?: {
    nombre_completo: string;
    nombre: string;
  };
};

export async function getFormulaMedica(pacienteId: string) {
  const { data, error } = await supabase
    .from("medicamentos_paciente")
    .select("*")
    .eq("paciente_id", pacienteId)
    .eq("activo", true)
    .order("medicamento_nombre", { ascending: true });

  if (error) {
    console.error("Error al obtener fórmula médica:", error);
    return [];
  }
  return data as MedicamentoPaciente[];
}

export async function agregarMedicamento(medicamento: Omit<MedicamentoPaciente, "id" | "activo">) {
  const { data, error } = await supabase
    .from("medicamentos_paciente")
    .insert([medicamento])
    .select("*")
    .single();

  if (error) {
    console.error("Error al agregar medicamento:", error);
    throw new Error(error.message);
  }
  return data as MedicamentoPaciente;
}

export async function eliminarMedicamento(id: string) {
  // En lugar de borrar, lo desactivamos para mantener historial
  const { error } = await supabase
    .from("medicamentos_paciente")
    .update({ activo: false })
    .eq("id", id);
    
  if (error) {
    console.error("Error al desactivar medicamento:", error);
    throw new Error(error.message);
  }
}

export async function getHistorialMedicamentosEntregados(pacienteId: string, limit: number = 100) {
  const { data, error } = await supabase
    .from("registro_medicamentos_entregados")
    .select("*, profiles(nombre_completo, nombre)")
    .eq("paciente_id", pacienteId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error al obtener historial de medicamentos:", error);
    return [];
  }
  return data as RegistroMedicamento[];
}
