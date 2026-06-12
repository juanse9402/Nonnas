"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, Plus, CalendarDays, Clock, Save, Loader2, Trash2, Activity, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getSignosPorPaciente, crearSignosVitales, eliminarRegistroClinico, RegistroClinicoSignos } from "@/lib/signosVitalesService";

type Props = {
  pacienteId: string;
  pacienteNombre: string;
  onClose: () => void;
};

export default function SignosVitalesModal({ pacienteId, pacienteNombre, onClose }: Props) {
  const [registros, setRegistros] = useState<RegistroClinicoSignos[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [hora, setHora] = useState(new Date().toTimeString().substring(0, 5));
  
  const [signos, setSignos] = useState({
    pas: "",
    pad: "",
    fc: "",
    temp: "",
    spo2: ""
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
      }
      
      const data = await getSignosPorPaciente(pacienteId);
      setRegistros(data);
      setLoading(false);
    }
    loadData();
  }, [pacienteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;

    setSaving(true);
    try {
      const fechaHoraIso = new Date(`${fecha}T${hora}:00`).toISOString();
      const nuevoRegistro = await crearSignosVitales(
        pacienteId,
        currentUserId,
        signos,
        fechaHoraIso
      );
      
      if (nuevoRegistro.datos.alerta) {
        alert(`¡Atención! Se detectaron anomalías:\n${nuevoRegistro.datos.detalles_alerta}`);
      }
      
      setRegistros([nuevoRegistro, ...registros].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setSignos({ pas: "", pad: "", fc: "", temp: "", spo2: "" });
    } catch (error: any) {
      console.error(error);
      alert("Error al guardar los signos vitales: " + (error.message || "Desconocido"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este registro?")) return;
    try {
      await eliminarRegistroClinico(id);
      setRegistros(registros.filter(r => r.id !== id));
    } catch (error) {
      alert("Error al eliminar el registro.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-teal-50/50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Activity className="w-6 h-6 text-teal-600" /> Control de Signos Vitales
            </h2>
            <p className="text-sm text-gray-500 mt-1">Paciente: <span className="font-semibold text-teal-700">{pacienteNombre}</span></p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full transition-colors text-gray-500 hover:text-gray-800 shadow-sm"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          
          {/* Formulario (Izquierda) */}
          <div className="w-full md:w-[35%] bg-gray-50 p-6 border-r border-gray-100 flex flex-col gap-6 overflow-y-auto">
            <div>
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-teal-600" />
                Nuevo Registro
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-gray-400" /> Fecha
                    </label>
                    <input
                      type="date"
                      required
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" /> Hora
                    </label>
                    <input
                      type="time"
                      required
                      value={hora}
                      onChange={(e) => setHora(e.target.value)}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">P. Sistólica</label>
                      <input type="number" required value={signos.pas} onChange={e => setSignos({...signos, pas: e.target.value})} placeholder="120" className="w-full border-gray-300 rounded-lg p-2 border text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">P. Diastólica</label>
                      <input type="number" required value={signos.pad} onChange={e => setSignos({...signos, pad: e.target.value})} placeholder="80" className="w-full border-gray-300 rounded-lg p-2 border text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">F. Cardíaca</label>
                      <input type="number" required value={signos.fc} onChange={e => setSignos({...signos, fc: e.target.value})} placeholder="75" className="w-full border-gray-300 rounded-lg p-2 border text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Temperatura (°C)</label>
                      <input type="number" step="0.1" required value={signos.temp} onChange={e => setSignos({...signos, temp: e.target.value})} placeholder="36.5" className="w-full border-gray-300 rounded-lg p-2 border text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">SpO2 (%)</label>
                    <input type="number" required value={signos.spo2} onChange={e => setSignos({...signos, spo2: e.target.value})} placeholder="98" className="w-full border-gray-300 rounded-lg p-2 border text-sm" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving || !currentUserId}
                  className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Guardar Signos
                </button>
              </form>
            </div>
          </div>

          {/* Lista de Registros (Derecha) */}
          <div className="w-full md:w-[65%] p-6 overflow-y-auto bg-white">
            <h3 className="font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-600" />
              Historial por Horas
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              </div>
            ) : registros.length === 0 ? (
              <div className="text-center py-12 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-500">No hay controles de signos vitales registrados para este paciente.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                      <th className="p-3 rounded-tl-lg font-medium">Fecha y Hora</th>
                      <th className="p-3 font-medium">T.A. (mmHg)</th>
                      <th className="p-3 font-medium">F.C. (lpm)</th>
                      <th className="p-3 font-medium">Temp (°C)</th>
                      <th className="p-3 font-medium">SpO2 (%)</th>
                      <th className="p-3 font-medium">Responsable</th>
                      <th className="p-3 rounded-tr-lg font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {registros.map((reg) => {
                      const d = new Date(reg.created_at);
                      const isAlert = reg.datos.alerta;
                      return (
                        <tr key={reg.id} className={`hover:bg-gray-50 transition-colors ${isAlert ? 'bg-red-50/50' : ''}`}>
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-800 text-sm">
                                {format(d, "HH:mm")}
                              </span>
                              <span className="text-xs text-gray-500">
                                {format(d, "d MMM yyyy", { locale: es })}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-sm font-medium text-gray-700">
                            {reg.datos.pas}/{reg.datos.pad}
                          </td>
                          <td className="p-3 text-sm text-gray-700">{reg.datos.fc}</td>
                          <td className="p-3 text-sm text-gray-700">{reg.datos.temp}</td>
                          <td className="p-3 text-sm text-gray-700">{reg.datos.spo2}</td>
                          <td className="p-3 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              {isAlert && <span title={reg.datos.detalles_alerta}><AlertCircle className="w-3 h-3 text-red-500" /></span>}
                              <span className="truncate max-w-[100px]" title={reg.profiles?.nombre_completo || reg.profiles?.nombre}>
                                {reg.profiles?.nombre_completo?.split(' ')[0] || reg.profiles?.nombre || "Auxiliar"}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <button 
                              onClick={() => handleDelete(reg.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
