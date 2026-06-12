import { supabase } from "./supabaseClient";

export type NotaEnfermeria = {
  id: string;
  paciente_id: string;
  auxiliar_id: string;
  fecha: string;
  hora: string;
  observacion: string;
  created_at: string;
  profiles?: {
    nombre_completo: string;
    nombre: string;
  };
};

export async function getNotasPorPaciente(pacienteId: string, fecha?: string) {
  let query = supabase
    .from("notas_enfermeria")
    .select("*, profiles(nombre_completo, nombre)")
    .eq("paciente_id", pacienteId)
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false });

  if (fecha) {
    query = query.eq("fecha", fecha);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error al obtener notas de enfermería:", error);
    return [];
  }

  return data as NotaEnfermeria[];
}

export async function crearNotaEnfermeria(nota: Omit<NotaEnfermeria, "id" | "created_at" | "profiles">) {
  const { data, error } = await supabase
    .from("notas_enfermeria")
    .insert([nota])
    .select("*, profiles(nombre_completo, nombre)")
    .single();

  if (error) {
    console.error("Error al crear nota de enfermería:", error);
    throw new Error(error.message);
  }

  return data as NotaEnfermeria;
}

export async function eliminarNotaEnfermeria(id: string) {
  const { error } = await supabase.from("notas_enfermeria").delete().eq("id", id);
  if (error) {
    console.error("Error al eliminar nota de enfermería:", error);
    throw new Error(error.message);
  }
}
