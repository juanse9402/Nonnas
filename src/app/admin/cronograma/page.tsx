"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Clock } from "lucide-react";
import { format, addDays, startOfWeek, subWeeks, addWeeks, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

type Turno = {
  id: string;
  paciente_id: string;
  auxiliar_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo_turno: string;
  pacientes?: { nombre_completo: string };
  profiles?: { nombre: string };
};

type Paciente = { id: string; nombre_completo: string };
type Auxiliar = { id: string; nombre: string };

export default function CronogramaPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [auxiliares, setAuxiliares] = useState<Auxiliar[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    paciente_id: "",
    auxiliar_id: "",
    fecha_inicio: format(new Date(), "yyyy-MM-dd'T'08:00"),
    fecha_fin: format(new Date(), "yyyy-MM-dd'T'20:00"),
    tipo_turno: "12h",
  });

  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  const fetchData = async () => {
    setLoading(true);
    
    const { data: turnosData } = await supabase
      .from("turnos_cronograma")
      .select("*");
      
    // Cargar diccionarios para selects
    const { data: pacData } = await supabase.from("pacientes").select("id, nombre_completo");
    const { data: auxData } = await supabase.from("profiles").select("id, nombre").eq("rol", "auxiliar");

    if (turnosData && pacData && auxData) {
      const turnosMapeados = turnosData.map((t: any) => ({
        ...t,
        pacientes: pacData.find(p => p.id === t.paciente_id),
        profiles: auxData.find(a => a.id === t.auxiliar_id)
      }));
      setTurnos(turnosMapeados);
      setPacientes(pacData);
      setAuxiliares(auxData);
    } else {
      if (pacData) setPacientes(pacData);
      if (auxData) setAuxiliares(auxData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  const handleOpenModal = (turno?: Turno) => {
    if (turno) {
      setEditingId(turno.id);
      setFormData({
        paciente_id: turno.paciente_id,
        auxiliar_id: turno.auxiliar_id,
        fecha_inicio: turno.fecha_inicio,
        fecha_fin: turno.fecha_fin,
        tipo_turno: turno.tipo_turno,
      });
    } else {
      setEditingId(null);
      setFormData({
        paciente_id: "",
        auxiliar_id: "",
        fecha_inicio: format(new Date(), "yyyy-MM-dd'T'08:00"),
        fecha_fin: format(new Date(), "yyyy-MM-dd'T'20:00"),
        tipo_turno: "12h",
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      paciente_id: formData.paciente_id,
      auxiliar_id: formData.auxiliar_id,
      fecha_inicio: formData.fecha_inicio,
      fecha_fin: formData.fecha_fin,
      tipo_turno: formData.tipo_turno,
    };

    if (editingId) {
      const { error } = await supabase.from("turnos_cronograma").update(payload).eq("id", editingId);
      if (!error) {
        setModalOpen(false);
        fetchData();
      } else {
        alert("Error al actualizar el turno");
      }
    } else {
      const { error } = await supabase.from("turnos_cronograma").insert([payload]);
      if (!error) {
        setModalOpen(false);
        fetchData();
      } else {
        alert("Error al guardar el turno");
      }
    }
  };

  const handleDelete = async () => {
    if (editingId && confirm("¿Estás seguro de que deseas eliminar este turno?")) {
      const { error } = await supabase.from("turnos_cronograma").delete().eq("id", editingId);
      if (!error) {
        setModalOpen(false);
        fetchData();
      } else {
        alert("Error al eliminar el turno");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-xl text-purple-600">
             <CalendarIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Cronograma</h1>
            <p className="text-gray-500 mt-1">Planificador semanal de turnos</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-[#2B6CB0] text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-800 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-5 h-5" />
          Asignar Turno
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Controles del calendario */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <button onClick={handlePrevWeek} className="p-2 hover:bg-gray-200 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-gray-700 capitalize">
            {format(startDate, "MMMM yyyy", { locale: es })}
          </h2>
          <button onClick={handleNextWeek} className="p-2 hover:bg-gray-200 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Cuadrícula */}
        <div className="grid grid-cols-7 divide-x divide-gray-100 min-h-[500px]">
          {weekDays.map((day, i) => (
            <div key={i} className="flex flex-col">
              <div className="p-3 text-center border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-medium text-gray-500 capitalize">{format(day, "EEEE", { locale: es })}</p>
                <p className={`text-xl font-bold mt-1 ${isSameDay(day, new Date()) ? 'text-[#2B6CB0]' : 'text-gray-800'}`}>
                  {format(day, "d")}
                </p>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {turnos
                  .filter((t) => {
                    const fechaDia = new Date(day);
                    fechaDia.setHours(0, 0, 0, 0);
                    
                    const inicio = new Date(t.fecha_inicio);
                    inicio.setHours(0, 0, 0, 0);
                    
                    const fin = new Date(t.fecha_fin);
                    fin.setHours(23, 59, 59, 999);
                    
                    return fechaDia >= inicio && fechaDia <= fin;
                  })
                  .map((t) => (
                    <div 
                      key={t.id} 
                      onClick={() => handleOpenModal(t)}
                      className="p-2 rounded-lg text-xs bg-[#4FD1C5]/10 border border-[#4FD1C5]/30 cursor-pointer hover:bg-[#4FD1C5]/20 hover:shadow-sm transition-all"
                    >
                      <p className="font-bold text-[#2B6CB0] truncate">{t.pacientes?.nombre_completo || 'Paciente Desconocido'}</p>
                      <p className="text-gray-600 truncate">{t.profiles?.nombre || 'Auxiliar Desconocido'}</p>
                      <div className="flex items-center gap-1 mt-2 text-gray-500 font-medium">
                        <Clock className="w-3 h-3" />
                        {t.fecha_inicio.includes('T') ? t.fecha_inicio.split('T')[1].substring(0,5) : t.fecha_inicio} ({t.tipo_turno})
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Asignar Turno */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">{editingId ? "Editar Turno" : "Asignar Turno"}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
                <select required name="paciente_id" value={formData.paciente_id} onChange={(e) => setFormData({...formData, paciente_id: e.target.value})} className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5] bg-white">
                  <option value="">Seleccione un paciente...</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Auxiliar</label>
                <select required name="auxiliar_id" value={formData.auxiliar_id} onChange={(e) => setFormData({...formData, auxiliar_id: e.target.value})} className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5] bg-white">
                  <option value="">Seleccione un auxiliar...</option>
                  {auxiliares.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inicio</label>
                  <input required type="datetime-local" name="fecha_inicio" value={formData.fecha_inicio} onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})} className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                  <input required type="datetime-local" name="fecha_fin" value={formData.fecha_fin} onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})} className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Turno</label>
                <select name="tipo_turno" value={formData.tipo_turno} onChange={(e) => setFormData({...formData, tipo_turno: e.target.value})} className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5] bg-white">
                  <option value="12h">12 Horas</option>
                  <option value="24h">24 Horas</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3 flex-wrap">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 px-4 border rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                {editingId && (
                  <button type="button" onClick={handleDelete} className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors">
                    Eliminar
                  </button>
                )}
                <button type="submit" className="flex-1 py-3 px-4 bg-[#2B6CB0] text-white rounded-xl font-medium hover:bg-blue-800 transition-colors">
                  {editingId ? "Guardar" : "Asignar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
