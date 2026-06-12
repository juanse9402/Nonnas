import { supabase } from "./supabaseClient";
import { evaluateVitals } from "./alertas";

export type SignosVitalesData = {
  pas: string;
  pad: string;
  fc: string;
  temp: string;
  spo2: string;
  alerta?: boolean;
  detalles_alerta?: string;
};

export type RegistroClinicoSignos = {
  id: string;
  paciente_id: string;
  auxiliar_id: string;
  tipo_registro: string;
  datos: SignosVitalesData;
  created_at: string;
  profiles?: {
    nombre_completo: string;
    nombre: string;
  };
};

export async function getSignosPorPaciente(pacienteId: string, limit: number = 50) {
  const { data, error } = await supabase
    .from("registros_clinicos")
    .select("*, profiles(nombre_completo, nombre)")
    .eq("paciente_id", pacienteId)
    .eq("tipo_registro", "signos_vitales")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error al obtener signos vitales:", error);
    return [];
  }

  return data as RegistroClinicoSignos[];
}

export async function crearSignosVitales(
  pacienteId: string, 
  auxiliarId: string, 
  signos: { pas: string; pad: string; fc: string; temp: string; spo2: string },
  fechaHoraIso: string // Para permitir ingreso retroactivo
) {
  const evalResult = evaluateVitals(signos);

  const payload = {
    paciente_id: pacienteId,
    auxiliar_id: auxiliarId,
    tipo_registro: "signos_vitales",
    created_at: fechaHoraIso,
    datos: {
      ...signos,
      alerta: evalResult.alerta,
      detalles_alerta: evalResult.detalles_alerta
    }
  };

  const { data, error } = await supabase
    .from("registros_clinicos")
    .insert([payload])
    .select("*, profiles(nombre_completo, nombre)")
    .single();

  if (error) {
    console.error("Error al registrar signos vitales:", error);
    throw new Error(error.message);
  }

  return data as RegistroClinicoSignos;
}

export async function eliminarRegistroClinico(id: string) {
  const { error } = await supabase.from("registros_clinicos").delete().eq("id", id);
  if (error) {
    console.error("Error al eliminar registro clínico:", error);
    throw new Error(error.message);
  }
}
