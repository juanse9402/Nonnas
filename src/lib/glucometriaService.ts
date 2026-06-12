import { supabase } from "./supabaseClient";

export type GlucometriaData = {
  momento: string;
  glucometria: string;
  insulina: string;
  observacion?: string;
  alerta?: boolean;
  detalles_alerta?: string;
};

export type RegistroClinicoGlucometria = {
  id: string;
  paciente_id: string;
  auxiliar_id: string;
  tipo_registro: string;
  datos: GlucometriaData;
  created_at: string;
  profiles?: {
    nombre_completo: string;
    nombre: string;
  };
};

export function evaluarGlucosa(valor: number): { alerta: boolean; detalle: string } {
  if (valor < 70) {
    return { alerta: true, detalle: `Hipoglicemia detectada: ${valor} mg/dL` };
  }
  // Tomaremos 180 o 200 como alerta de hiperglicemia dependiendo de las guías, usemos 200 para alerta fuerte.
  if (valor > 200) {
    return { alerta: true, detalle: `Hiperglicemia detectada: ${valor} mg/dL` };
  }
  return { alerta: false, detalle: "" };
}

export async function getGlucometriaPorPaciente(pacienteId: string, limit: number = 50) {
  const { data, error } = await supabase
    .from("registros_clinicos")
    .select("*, profiles(nombre_completo, nombre)")
    .eq("paciente_id", pacienteId)
    .eq("tipo_registro", "glucometria_insulina")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error al obtener glucometrias:", error);
    return [];
  }

  return data as RegistroClinicoGlucometria[];
}

export async function crearGlucometria(
  pacienteId: string, 
  auxiliarId: string, 
  datosG: Omit<GlucometriaData, "alerta" | "detalles_alerta">,
  fechaHoraIso: string
) {
  
  // Evaluar alertas si hay valor de glucometría
  let alertaInfo = { alerta: false, detalle: "" };
  if (datosG.glucometria && datosG.glucometria.trim() !== "") {
    alertaInfo = evaluarGlucosa(Number(datosG.glucometria));
  }

  const payload = {
    paciente_id: pacienteId,
    auxiliar_id: auxiliarId,
    tipo_registro: "glucometria_insulina",
    created_at: fechaHoraIso,
    datos: {
      ...datosG,
      alerta: alertaInfo.alerta,
      detalles_alerta: alertaInfo.detalle
    }
  };

  const { data, error } = await supabase
    .from("registros_clinicos")
    .insert([payload])
    .select("*, profiles(nombre_completo, nombre)")
    .single();

  if (error) {
    console.error("Error al registrar glucometria:", error);
    throw new Error(error.message);
  }

  return data as RegistroClinicoGlucometria;
}
