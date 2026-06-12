import { supabase } from "./supabaseClient";

export type DiuresisDeposicionesData = {
  tipo: "Diuresis" | "Deposición";
  cantidad_o_aspecto: string;
  observacion_tratamiento?: string;
};

export type RegistroClinicoDiuresis = {
  id: string;
  paciente_id: string;
  auxiliar_id: string;
  tipo_registro: string;
  datos: DiuresisDeposicionesData;
  created_at: string;
  profiles?: {
    nombre_completo: string;
    nombre: string;
  };
};

export async function getDiuresisPorPaciente(pacienteId: string, limit: number = 50) {
  const { data, error } = await supabase
    .from("registros_clinicos")
    .select("*, profiles(nombre_completo, nombre)")
    .eq("paciente_id", pacienteId)
    .eq("tipo_registro", "diuresis_deposiciones")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error al obtener controles de eliminación:", error);
    return [];
  }

  return data as RegistroClinicoDiuresis[];
}

export async function crearDiuresisDeposicion(
  pacienteId: string, 
  auxiliarId: string, 
  datosEliminacion: DiuresisDeposicionesData,
  fechaHoraIso: string
) {
  const payload = {
    paciente_id: pacienteId,
    auxiliar_id: auxiliarId,
    tipo_registro: "diuresis_deposiciones",
    created_at: fechaHoraIso,
    datos: datosEliminacion
  };

  const { data, error } = await supabase
    .from("registros_clinicos")
    .insert([payload])
    .select("*, profiles(nombre_completo, nombre)")
    .single();

  if (error) {
    console.error("Error al registrar control de eliminación:", error);
    throw new Error(error.message);
  }

  return data as RegistroClinicoDiuresis;
}
