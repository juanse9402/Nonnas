"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, Plus, CalendarDays, Clock, Save, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getNotasPorPaciente, crearNotaEnfermeria, eliminarNotaEnfermeria, NotaEnfermeria } from "@/lib/notasEnfermeriaService";

type Props = {
  pacienteId: string;
  pacienteNombre: string;
  onClose: () => void;
};

export default function NotasEnfermeriaModal({ pacienteId, pacienteNombre, onClose }: Props) {
  const [notas, setNotas] = useState<NotaEnfermeria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [hora, setHora] = useState(new Date().toTimeString().substring(0, 5));
  const [observacion, setObservacion] = useState("");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
      }
      
      const data = await getNotasPorPaciente(pacienteId);
      setNotas(data);
      setLoading(false);
    }
    loadData();
  }, [pacienteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !observacion.trim()) return;

    setSaving(true);
    try {
      const nuevaNota = await crearNotaEnfermeria({
        paciente_id: pacienteId,
        auxiliar_id: currentUserId,
        fecha,
        hora,
        observacion
      });
      setNotas([nuevaNota, ...notas]);
      setObservacion(""); // Reset solo la observación, mantener fecha/hora
    } catch (error) {
      alert("Error al guardar la nota.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta nota?")) return;
    try {
      await eliminarNotaEnfermeria(id);
      setNotas(notas.filter(n => n.id !== id));
    } catch (error) {
      alert("Error al eliminar la nota.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-purple-50/50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Notas de Enfermería</h2>
            <p className="text-sm text-gray-500 mt-1">Paciente: <span className="font-semibold text-purple-700">{pacienteNombre}</span></p>
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
          <div className="w-full md:w-1/3 bg-gray-50 p-6 border-r border-gray-100 flex flex-col gap-6 overflow-y-auto">
            <div>
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" />
                Nueva Nota
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-gray-400" /> Fecha
                  </label>
                  <input
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 p-2 border"
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
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observación / Acción</label>
                  <textarea
                    required
                    rows={5}
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    placeholder="Escribe aquí el detalle de la evolución..."
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 p-3 border resize-none"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={saving || !currentUserId}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Guardar Nota
                </button>
              </form>
            </div>
          </div>

          {/* Lista de Notas (Derecha) */}
          <div className="w-full md:w-2/3 p-6 overflow-y-auto bg-white">
            <h3 className="font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              Diario Cronológico
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : notas.length === 0 ? (
              <div className="text-center py-12 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-500">No hay notas registradas para este paciente.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {notas.map((nota) => (
                  <div key={nota.id} className="relative pl-6 before:absolute before:left-0 before:top-2 before:bottom-[-24px] before:w-0.5 before:bg-gray-200 last:before:hidden group">
                    <div className="absolute left-[-5px] top-2 w-3 h-3 rounded-full bg-purple-500 ring-4 ring-purple-50"></div>
                    
                    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-500" /> {nota.hora.substring(0, 5)}
                          </span>
                          <span className="text-xs text-gray-500 mt-0.5">
                            {format(new Date(nota.fecha + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: es })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full border border-purple-100 font-medium">
                            {nota.profiles?.nombre_completo || nota.profiles?.nombre || "Auxiliar"}
                          </span>
                          <button 
                            onClick={() => handleDelete(nota.id)}
                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Eliminar nota"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-50">
                        {nota.observacion}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
