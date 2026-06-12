"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, Plus, CalendarDays, Clock, Save, Loader2, Trash2, Droplet } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  getDiuresisPorPaciente, 
  crearDiuresisDeposicion, 
  RegistroClinicoDiuresis,
  DiuresisDeposicionesData
} from "@/lib/diuresisService";
import { eliminarRegistroClinico } from "@/lib/signosVitalesService";

type Props = {
  pacienteId: string;
  pacienteNombre: string;
  onClose: () => void;
};

export default function DiuresisDeposicionesModal({ pacienteId, pacienteNombre, onClose }: Props) {
  const [registros, setRegistros] = useState<RegistroClinicoDiuresis[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [hora, setHora] = useState(new Date().toTimeString().substring(0, 5));
  
  const [datos, setDatos] = useState<DiuresisDeposicionesData>({
    tipo: "Diuresis",
    cantidad_o_aspecto: "Normal",
    observacion_tratamiento: ""
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
      }
      
      const data = await getDiuresisPorPaciente(pacienteId);
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
      const nuevoRegistro = await crearDiuresisDeposicion(
        pacienteId,
        currentUserId,
        datos,
        fechaHoraIso
      );
      
      setRegistros([nuevoRegistro, ...registros].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setDatos({ ...datos, observacion_tratamiento: "" }); // Reseteamos observación para el siguiente
    } catch (error: any) {
      console.error(error);
      alert("Error al guardar el registro: " + (error.message || "Desconocido"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este registro?")) return;
    try {
      // Reutilizamos el delete genérico de registros_clinicos
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
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-amber-50/50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Droplet className="w-6 h-6 text-amber-600" /> Diuresis y Deposiciones
            </h2>
            <p className="text-sm text-gray-500 mt-1">Paciente: <span className="font-semibold text-amber-700">{pacienteNombre}</span></p>
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
                <Plus className="w-5 h-5 text-amber-600" />
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
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-amber-500 focus:border-amber-500 p-2 border"
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
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-amber-500 focus:border-amber-500 p-2 border"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Eliminación</label>
                    <select 
                      value={datos.tipo} 
                      onChange={e => setDatos({...datos, tipo: e.target.value as "Diuresis" | "Deposición"})}
                      className="w-full border-gray-300 rounded-lg p-2.5 border text-sm focus:ring-amber-500 focus:border-amber-500 bg-white"
                    >
                      <option value="Diuresis">Diuresis (Orina)</option>
                      <option value="Deposición">Deposición (Heces)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad o Aspecto</label>
                    <select 
                      value={datos.cantidad_o_aspecto} 
                      onChange={e => setDatos({...datos, cantidad_o_aspecto: e.target.value})}
                      className="w-full border-gray-300 rounded-lg p-2.5 border text-sm focus:ring-amber-500 focus:border-amber-500 bg-white"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Abundante">Abundante</option>
                      <option value="Escasa">Escasa / Poca</option>
                      <option value="Ausente">Ausente</option>
                      {datos.tipo === "Deposición" && (
                        <>
                          <option value="Dura">Dura / Seca</option>
                          <option value="Líquida">Líquida (Diarrea)</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones / Tratamiento</label>
                    <textarea 
                      rows={3}
                      value={datos.observacion_tratamiento} 
                      onChange={e => setDatos({...datos, observacion_tratamiento: e.target.value})}
                      placeholder="Ej. Se le dio jugo de ciruela por estreñimiento..."
                      className="w-full border-gray-300 rounded-lg p-3 border text-sm focus:ring-amber-500 focus:border-amber-500 resize-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving || !currentUserId}
                  className="w-full mt-2 bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Guardar Control
                </button>
              </form>
            </div>
          </div>

          {/* Lista de Registros (Derecha) */}
          <div className="w-full md:w-[65%] p-6 overflow-y-auto bg-white">
            <h3 className="font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Historial de Eliminación
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
              </div>
            ) : registros.length === 0 ? (
              <div className="text-center py-12 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-500">No hay controles registrados para este paciente.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                      <th className="p-3 rounded-tl-lg font-medium">Fecha y Hora</th>
                      <th className="p-3 font-medium">Tipo</th>
                      <th className="p-3 font-medium">Cantidad/Aspecto</th>
                      <th className="p-3 font-medium min-w-[200px]">Observaciones</th>
                      <th className="p-3 font-medium">Auxiliar</th>
                      <th className="p-3 rounded-tr-lg font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {registros.map((reg) => {
                      const d = new Date(reg.created_at);
                      const isDeposicion = reg.datos.tipo === "Deposición";
                      return (
                        <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
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
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${isDeposicion ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                              {reg.datos.tipo}
                            </span>
                          </td>
                          <td className="p-3 text-sm font-medium text-gray-700">
                            {reg.datos.cantidad_o_aspecto}
                          </td>
                          <td className="p-3 text-sm text-gray-600">
                            {reg.datos.observacion_tratamiento || "-"}
                          </td>
                          <td className="p-3 text-xs text-gray-600">
                            {reg.profiles?.nombre_completo?.split(' ')[0] || reg.profiles?.nombre || "Auxiliar"}
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
