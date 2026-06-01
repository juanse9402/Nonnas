import { SupabaseClient } from '@supabase/supabase-js';

export const OFFLINE_QUEUE_KEY = 'cola_sincronizacion_offline';

export type OfflineRecord = {
  id: string; // uuid
  type: 'registro_clinico' | 'historia_clinica' | 'registro_medicamento';
  payload: any;
  timestamp: string;
};

// Guarda un registro en la cola offline local
export const saveOfflineRecord = (type: OfflineRecord['type'], payload: any) => {
  try {
    const existing = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: OfflineRecord[] = existing ? JSON.parse(existing) : [];
    
    queue.push({
      id: crypto.randomUUID(),
      type,
      payload,
      timestamp: new Date().toISOString()
    });
    
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    console.log(`[Offline Sync] Guardado localmente: ${type}`);
    return true;
  } catch (error) {
    console.error("Error al guardar en localStorage", error);
    return false;
  }
};

export const getOfflineRecords = (): OfflineRecord[] => {
  try {
    const existing = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch {
    return [];
  }
};

export const clearOfflineRecords = () => {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
};

// Sincroniza los registros pendientes cuando hay conexión
export const syncOfflineRecords = async (supabase: SupabaseClient) => {
  const records = getOfflineRecords();
  if (records.length === 0) return { success: true, syncedCount: 0 };

  console.log(`[Offline Sync] Iniciando sincronización de ${records.length} registros...`);
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error("[Offline Sync] No hay sesión activa. Se pospone la sincronización.");
    return { success: false, syncedCount: 0 };
  }

  let successCount = 0;
  const failedRecords: OfflineRecord[] = [];

  for (const record of records) {
    try {
      if (record.type === 'historia_clinica') {
        // Enviar vía API
        const res = await fetch("/api/save-historia", {
          method: "POST",
          headers: { 
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(record.payload)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Error guardando historia');
      } else if (record.type === 'registro_clinico') {
        // Enviar directo con cliente
        const { error } = await supabase.from("registros_clinicos").insert([record.payload]);
        if (error) throw error;
      } else if (record.type === 'registro_medicamento') {
        const { error } = await supabase.from("registro_medicamentos_entregados").insert([record.payload]);
        if (error) throw error;
      }
      
      successCount++;
    } catch (err) {
      console.error(`[Offline Sync] Fallo al sincronizar registro ${record.id}`, err);
      failedRecords.push(record);
    }
  }

  // Actualizar la cola manteniendo los que fallaron
  if (failedRecords.length > 0) {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failedRecords));
    console.warn(`[Offline Sync] Sincronización parcial. Quedan ${failedRecords.length} pendientes.`);
    return { success: false, syncedCount: successCount, remaining: failedRecords.length };
  } else {
    clearOfflineRecords();
    console.log("[Offline Sync] Sincronización completada al 100%");
    return { success: true, syncedCount: successCount };
  }
};
