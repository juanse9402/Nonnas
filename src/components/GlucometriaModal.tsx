"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, Plus, CalendarDays, Clock, Save, Loader2, Trash2, Droplets, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  getGlucometriaPorPaciente, 
  crearGlucometria, 
  RegistroClinicoGlucometria,
  GlucometriaData
} from "@/lib/glucometriaService";
import { eliminarRegistroClinico } from "@/lib/signosVitalesService";

type Props = {
  pacienteId: string;
  pacienteNombre: string;
  onClose: () => void;
};

const MOMENTOS_DEL_DIA = [
  "3 AM",
  "Antes Desayuno",
  "Desayuno",
  "2 Horas Después Desayuno",
  "Antes Almuerzo",
  "Almuerzo",
  "2 Horas Después Almuerzo",
  "Antes Cena",
  "2 Horas Después Cena",
  "Acostarse"
];

export default function GlucometriaModal({ pacienteId, pacienteNombre, onClose }: Props) {
  const [registros, setRegistros] = useState<RegistroClinicoGlucometria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [hora, setHora] = useState(new Date().toTimeString().substring(0, 5));
  
  const [datos, setDatos] = useState<GlucometriaData>({
    momento: "Antes Desayuno",
    glucometria: "",
    insulina: "",
    observacion: ""
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
      }
      
      const data = await getGlucometriaPorPaciente(pacienteId);
      setRegistros(data);
      setLoading(false);
    }
    loadData();
  }, [pacienteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;

    if (!datos.glucometria && !datos.insulina) {
      alert("Debes ingresar al menos el valor de la glucometría o la dosis de insulina.");
      return;
    }

    setSaving(true);
    try {
      const fechaHoraIso = new Date(`${fecha}T${hora}:00`).toISOString();
      const nuevoRegistro = await crearGlucometria(
        pacienteId,
        currentUserId,
        datos,
        fechaHoraIso
      );
      
      if (nuevoRegistro.datos.alerta) {
        alert(`¡Atención!\n${nuevoRegistro.datos.detalles_alerta}`);
      }

      setRegistros([nuevoRegistro, ...registros].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setDatos({ ...datos, glucometria: "", insulina: "", observacion: "" });
    } catch (error) {
      alert("Error al guardar el registro.");
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
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-cyan-50/50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Droplets className="w-6 h-6 text-cyan-600" /> Glucometría e Insulina
            </h2>
            <p className="text-sm text-gray-500 mt-1">Paciente: <span className="font-semibold text-cyan-700">{pacienteNombre}</span></p>
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
                <Plus className="w-5 h-5 text-cyan-600" />
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
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-cyan-500 focus:border-cyan-500 p-2 border"
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
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-cyan-500 focus:border-cyan-500 p-2 border"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Momento del Día</label>
                    <select 
                      value={datos.momento} 
                      onChange={e => setDatos({...datos, momento: e.target.value})}
                      className="w-full border-gray-300 rounded-lg p-2.5 border text-sm focus:ring-cyan-500 focus:border-cyan-500 bg-white"
                    >
                      {MOMENTOS_DEL_DIA.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Glucometría (mg/dL)</label>
                      <input 
                        type="number" 
                        value={datos.glucometria} 
                        onChange={e => setDatos({...datos, glucometria: e.target.value})} 
                        placeholder="Ej. 110" 
                        className="w-full border-gray-300 rounded-lg p-2.5 border text-sm focus:ring-cyan-500 focus:border-cyan-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Insulina (Unidades)</label>
                      <input 
                        type="number" 
                        value={datos.insulina} 
                        onChange={e => setDatos({...datos, insulina: e.target.value})} 
                        placeholder="Ej. 5" 
                        className="w-full border-gray-300 rounded-lg p-2.5 border text-sm focus:ring-cyan-500 focus:border-cyan-500" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observación (Opcional)</label>
                    <input 
                      type="text"
                      value={datos.observacion} 
                      onChange={e => setDatos({...datos, observacion: e.target.value})}
                      placeholder="Ej. El paciente no quiso desayunar"
                      className="w-full border-gray-300 rounded-lg p-2.5 border text-sm focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving || !currentUserId}
                  className="w-full mt-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Guardar Registro
                </button>
              </form>
            </div>
          </div>

          {/* Lista de Registros (Derecha) */}
          <div className="w-full md:w-[65%] p-6 overflow-y-auto bg-white">
            <h3 className="font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-600" />
              Historial de Glucosa e Insulina
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
              </div>
            ) : registros.length === 0 ? (
              <div className="text-center py-12 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-500">No hay controles de glucometría registrados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                      <th className="p-3 rounded-tl-lg font-medium">Fecha/Hora</th>
                      <th className="p-3 font-medium">Momento</th>
                      <th className="p-3 font-medium text-center">Glucosa (mg/dL)</th>
                      <th className="p-3 font-medium text-center">Insulina (UI)</th>
                      <th className="p-3 font-medium">Auxiliar</th>
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
                                {format(d, "d MMM", { locale: es })}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-md">
                              {reg.datos.momento}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {isAlert && <span title={reg.datos.detalles_alerta}><AlertCircle className="w-4 h-4 text-red-500" /></span>}
                              <span className={`text-sm font-bold ${isAlert ? 'text-red-600' : 'text-gray-800'}`}>
                                {reg.datos.glucometria || "-"}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-sm font-semibold text-blue-600">
                              {reg.datos.insulina ? `${reg.datos.insulina} UI` : "-"}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-gray-600">
                            <span className="truncate max-w-[100px] inline-block" title={reg.profiles?.nombre_completo || reg.profiles?.nombre}>
                              {reg.profiles?.nombre_completo?.split(' ')[0] || reg.profiles?.nombre || "Auxiliar"}
                            </span>
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
