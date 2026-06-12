"use client";

import { useState, useEffect } from "react";
import { X, Plus, Pill, Save, Loader2, Trash2, Clock, CalendarDays, CheckCircle, ListChecks } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  getFormulaMedica, 
  agregarMedicamento, 
  eliminarMedicamento, 
  getHistorialMedicamentosEntregados,
  MedicamentoPaciente,
  RegistroMedicamento
} from "@/lib/medicamentosService";

type Props = {
  pacienteId: string;
  pacienteNombre: string;
  onClose: () => void;
};

export default function MedicamentosAdminModal({ pacienteId, pacienteNombre, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<"formula" | "historial">("formula");
  const [loading, setLoading] = useState(true);
  
  // Fórmula state
  const [formula, setFormula] = useState<MedicamentoPaciente[]>([]);
  const [savingMed, setSavingMed] = useState(false);
  const [newMed, setNewMed] = useState({
    medicamento_nombre: "",
    presentacion: "",
    dosis: "",
    horarios: "" // string separado por comas
  });

  // Historial state
  const [historial, setHistorial] = useState<RegistroMedicamento[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [fData, hData] = await Promise.all([
        getFormulaMedica(pacienteId),
        getHistorialMedicamentosEntregados(pacienteId)
      ]);
      setFormula(fData);
      setHistorial(hData);
      setLoading(false);
    }
    loadData();
  }, [pacienteId]);

  const handleAddMed = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMed(true);
    try {
      const horariosArray = newMed.horarios.split(",").map(h => h.trim()).filter(h => h);
      const added = await agregarMedicamento({
        paciente_id: pacienteId,
        medicamento_nombre: newMed.medicamento_nombre,
        presentacion: newMed.presentacion,
        dosis: newMed.dosis,
        horarios: horariosArray
      });
      setFormula([...formula, added]);
      setNewMed({ medicamento_nombre: "", presentacion: "", dosis: "", horarios: "" });
    } catch (error) {
      alert("Error al agregar medicamento");
    } finally {
      setSavingMed(false);
    }
  };

  const handleDeleteMed = async (id: string) => {
    if (!confirm("¿Desactivar este medicamento de la fórmula?")) return;
    try {
      await eliminarMedicamento(id);
      setFormula(formula.filter(m => m.id !== id));
    } catch (error) {
      alert("Error al desactivar medicamento");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-rose-50/50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Pill className="w-6 h-6 text-rose-600" /> Control de Medicamentos
            </h2>
            <p className="text-sm text-gray-500 mt-1">Paciente: <span className="font-semibold text-rose-700">{pacienteNombre}</span></p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full transition-colors text-gray-500 hover:text-gray-800 shadow-sm"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50/50 px-6">
          <button
            onClick={() => setActiveTab("formula")}
            className={`py-4 px-6 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "formula" 
                ? "border-rose-500 text-rose-700" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <ListChecks className="w-4 h-4" /> Fórmula Médica
          </button>
          <button
            onClick={() => setActiveTab("historial")}
            className={`py-4 px-6 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "historial" 
                ? "border-rose-500 text-rose-700" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Clock className="w-4 h-4" /> Historial de Entregas
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-white p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
            </div>
          ) : activeTab === "formula" ? (
            <div className="flex flex-col md:flex-row gap-8">
              
              {/* Formulario Agregar Medicamento */}
              <div className="w-full md:w-[40%] bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-rose-600" />
                  Nueva Prescripción
                </h3>
                <form onSubmit={handleAddMed} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medicamento</label>
                    <input type="text" required value={newMed.medicamento_nombre} onChange={e => setNewMed({...newMed, medicamento_nombre: e.target.value})} placeholder="Ej. Losartán" className="w-full border-gray-300 rounded-lg p-2.5 border text-sm focus:ring-rose-500 focus:border-rose-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Presentación</label>
                      <input type="text" required value={newMed.presentacion} onChange={e => setNewMed({...newMed, presentacion: e.target.value})} placeholder="Ej. Tableta 50mg" className="w-full border-gray-300 rounded-lg p-2.5 border text-sm focus:ring-rose-500 focus:border-rose-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dosis</label>
                      <input type="text" required value={newMed.dosis} onChange={e => setNewMed({...newMed, dosis: e.target.value})} placeholder="Ej. 1 Tableta" className="w-full border-gray-300 rounded-lg p-2.5 border text-sm focus:ring-rose-500 focus:border-rose-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Horarios (separados por coma)</label>
                    <input type="text" required value={newMed.horarios} onChange={e => setNewMed({...newMed, horarios: e.target.value})} placeholder="Ej. 08:00, 14:00, 20:00" className="w-full border-gray-300 rounded-lg p-2.5 border text-sm focus:ring-rose-500 focus:border-rose-500" />
                  </div>
                  <button type="submit" disabled={savingMed} className="w-full mt-2 bg-rose-600 hover:bg-rose-700 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {savingMed ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Guardar Fórmula
                  </button>
                </form>
              </div>

              {/* Lista de Medicamentos Activos */}
              <div className="w-full md:w-[60%]">
                <h3 className="font-semibold text-gray-800 mb-4">Fórmula Activa del Paciente</h3>
                {formula.length === 0 ? (
                  <div className="text-center py-10 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-500">Este paciente no tiene medicamentos activos prescritos.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {formula.map((med) => (
                      <div key={med.id} className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center shadow-sm hover:shadow-md transition-all group">
                        <div>
                          <h4 className="font-bold text-gray-800 text-lg">{med.medicamento_nombre}</h4>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
                            <span><strong className="font-medium text-gray-500">Pres:</strong> {med.presentacion}</span>
                            <span><strong className="font-medium text-gray-500">Dosis:</strong> {med.dosis}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {med.horarios.map((h, i) => (
                              <span key={i} className="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-rose-100 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {h}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteMed(med.id)} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Eliminar de la fórmula">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            // Tab Historial
            <div>
              {historial.length === 0 ? (
                <div className="text-center py-12 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-500">Aún no hay registros de administración de medicamentos.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                        <th className="p-4 font-medium">Fecha de Entrega</th>
                        <th className="p-4 font-medium">Hora Prog.</th>
                        <th className="p-4 font-medium">Medicamento</th>
                        <th className="p-4 font-medium">Estado</th>
                        <th className="p-4 font-medium">Entregado por</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {historial.map((reg) => {
                        const d = new Date(reg.created_at);
                        return (
                          <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-gray-400" />
                                <span className="font-medium text-gray-800 text-sm">{format(d, "dd/MM/yyyy HH:mm")}</span>
                              </div>
                            </td>
                            <td className="p-4 text-sm font-semibold text-rose-600">
                              {reg.hora_programada}
                            </td>
                            <td className="p-4 text-sm font-medium text-gray-800">
                              {reg.medicamento_nombre}
                            </td>
                            <td className="p-4 text-sm">
                              {reg.entregado ? (
                                <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-green-200">
                                  <CheckCircle className="w-3 h-3" /> Administrado
                                </span>
                              ) : (
                                <span className="text-gray-400">Pendiente</span>
                              )}
                            </td>
                            <td className="p-4 text-sm text-gray-600">
                              {reg.profiles?.nombre_completo || reg.profiles?.nombre || "Auxiliar"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
