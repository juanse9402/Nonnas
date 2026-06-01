// Tipos esperados de los signos vitales
export interface SignosVitalesInput {
  pas: number | string; // Presión sistólica
  pad: number | string; // Presión diastólica
  fc: number | string;  // Frecuencia cardíaca
  temp: number | string; // Temperatura
  spo2: number | string; // Saturación de oxígeno
}

export interface AlertaEvaluacion {
  alerta: boolean;
  detalles_alerta: string;
}

/**
 * Evalúa los signos vitales para un adulto mayor y retorna si hay alerta.
 * Rangos de alerta recomendados:
 * - Saturación (SpO2): < 94%
 * - Presión Sistólica (Sys): > 140 o < 90
 * - Presión Diastólica (Dia): > 90 o < 60
 * - Frecuencia Cardíaca (Pulso): > 100 o < 50
 * - Temperatura: >= 37.5 o < 35.0
 */
export const evaluateVitals = (signos: SignosVitalesInput): AlertaEvaluacion => {
  const anomalias: string[] = [];
  let alerta = false;

  const pas = Number(signos.pas);
  const pad = Number(signos.pad);
  const fc = Number(signos.fc);
  const temp = Number(signos.temp);
  const spo2 = Number(signos.spo2);

  if (spo2 > 0 && spo2 < 94) {
    alerta = true;
    anomalias.push(`Saturación baja: ${spo2}%`);
  }

  if (pas > 0 && (pas > 140 || pas < 90)) {
    alerta = true;
    anomalias.push(`P. Sistólica anormal: ${pas} mmHg`);
  }

  if (pad > 0 && (pad > 90 || pad < 60)) {
    alerta = true;
    anomalias.push(`P. Diastólica anormal: ${pad} mmHg`);
  }

  if (fc > 0 && (fc > 100 || fc < 50)) {
    alerta = true;
    anomalias.push(`Pulso anormal: ${fc} lpm`);
  }

  if (temp > 0 && (temp >= 37.5 || temp < 35.0)) {
    alerta = true;
    anomalias.push(`Temperatura anormal: ${temp}°C`);
  }

  return {
    alerta,
    detalles_alerta: anomalias.length > 0 ? anomalias.join(". ") + "." : ""
  };
};
