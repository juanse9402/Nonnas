import { supabase } from "./supabaseClient";

export type NotaEnfermeria = {
  id: string;
  paciente_id: string;
  auxiliar_id: string;
  tipo_registro: string;
  datos: { observacion: string };
  created_at: string;
  profiles?: {
    nombre_completo: string;
    nombre: string;
  };
};

export async function getNotasPorPaciente(pacienteId: string, limit: number = 50) {
  const { data, error } = await supabase
    .from("registros_clinicos")
    .select("*, profiles(nombre_completo, nombre)")
    .eq("paciente_id", pacienteId)
    .eq("tipo_registro", "notas_enfermeria")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error al obtener notas de enfermería:", error);
    return [];
  }

  return data as NotaEnfermeria[];
}

export async function crearNotaEnfermeria(
  pacienteId: string,
  auxiliarId: string,
  observacion: string,
  fechaHoraIso: string
) {
  const payload = {
    paciente_id: pacienteId,
    auxiliar_id: auxiliarId,
    tipo_registro: "notas_enfermeria",
    created_at: fechaHoraIso,
    datos: { observacion }
  };

  const { data, error } = await supabase
    .from("registros_clinicos")
    .insert([payload])
    .select("*, profiles(nombre_completo, nombre)")
    .single();

  if (error) {
    console.error("Error al crear nota de enfermería:", error);
    throw new Error(error.message);
  }

  return data as NotaEnfermeria;
}

export async function eliminarNotaEnfermeria(id: string) {
  const { error } = await supabase.from("registros_clinicos").delete().eq("id", id);
  if (error) {
    console.error("Error al eliminar nota de enfermería:", error);
    throw new Error(error.message);
  }
}
