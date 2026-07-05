"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Clock } from "lucide-react";
import { format, addDays, startOfWeek, subWeeks, addWeeks, addMonths, isSameDay, startOfMonth, endOfMonth } from "date-fns";
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

const getPatientColor = (id: string, list: Paciente[]) => {
  const hues = [210, 140, 280, 40, 340, 255, 175, 195, 290, 20, 90, 320];
  const listIndex = list.findIndex(item => item.id === id);
  const index = listIndex !== -1 ? listIndex : 0;
  const hue = hues[index % hues.length];
  return {
    style: {
      backgroundColor: `hsl(${hue}, 80%, 96%)`,
      borderColor: `hsl(${hue}, 40%, 80%)`,
      color: `hsl(${hue}, 80%, 25%)`
    },
    labelStyle: {
      color: `hsl(${hue}, 70%, 40%)`
    }
  };
};

const getAuxiliarColor = (id: string, list: Auxiliar[]) => {
  const hues = [270, 200, 160, 310, 25, 80, 345, 185, 45, 240, 120, 5];
  const listIndex = list.findIndex(item => item.id === id);
  const index = listIndex !== -1 ? listIndex : 0;
  const hue = hues[index % hues.length];
  return {
    style: {
      backgroundColor: `hsl(${hue}, 75%, 90%)`,
      borderColor: `hsl(${hue}, 40%, 75%)`,
      color: `hsl(${hue}, 85%, 25%)`
    }
  };
};

const formatForDateTimeLocal = (dateString: string) => {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) {
      if (dateString.includes('T') && dateString.length >= 16) {
        return dateString.substring(0, 16);
      }
      return "";
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (e) {
    return "";
  }
};

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
    repetir: "ninguno",
    repetir_cant: "4",
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
        fecha_inicio: formatForDateTimeLocal(turno.fecha_inicio),
        fecha_fin: formatForDateTimeLocal(turno.fecha_fin),
        tipo_turno: turno.tipo_turno,
        repetir: "ninguno",
        repetir_cant: "4",
      });
    } else {
      setEditingId(null);
      setFormData({
        paciente_id: "",
        auxiliar_id: "",
        fecha_inicio: format(new Date(), "yyyy-MM-dd'T'08:00"),
        fecha_fin: format(new Date(), "yyyy-MM-dd'T'20:00"),
        tipo_turno: "12h",
        repetir: "ninguno",
        repetir_cant: "4",
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
        if (formData.repetir !== "ninguno") {
          const cant = parseInt(formData.repetir_cant) || 1;
          const inicioOriginal = new Date(formData.fecha_inicio);
          const finOriginal = new Date(formData.fecha_fin);
          const repeatPayloads = [];
          
          for (let i = 1; i <= cant; i++) {
            let nuevoInicio: Date;
            let nuevoFin: Date;
            
            if (formData.repetir === "semanal") {
              nuevoInicio = addWeeks(inicioOriginal, i);
              nuevoFin = addWeeks(finOriginal, i);
            } else { // mensual
              nuevoInicio = addMonths(inicioOriginal, i);
              nuevoFin = addMonths(finOriginal, i);
            }
            
            repeatPayloads.push({
              paciente_id: formData.paciente_id,
              auxiliar_id: formData.auxiliar_id,
              fecha_inicio: format(nuevoInicio, "yyyy-MM-dd'T'HH:mm"),
              fecha_fin: format(nuevoFin, "yyyy-MM-dd'T'HH:mm"),
              tipo_turno: formData.tipo_turno,
            });
          }
          await supabase.from("turnos_cronograma").insert(repeatPayloads);
        }
        setModalOpen(false);
        fetchData();
      } else {
        alert("Error al actualizar el turno");
      }
    } else {
      const payloads = [payload];
      
      if (formData.repetir !== "ninguno") {
        const cant = parseInt(formData.repetir_cant) || 1;
        const inicioOriginal = new Date(formData.fecha_inicio);
        const finOriginal = new Date(formData.fecha_fin);
        
        for (let i = 1; i <= cant; i++) {
          let nuevoInicio: Date;
          let nuevoFin: Date;
          
          if (formData.repetir === "semanal") {
            nuevoInicio = addWeeks(inicioOriginal, i);
            nuevoFin = addWeeks(finOriginal, i);
          } else { // mensual
            nuevoInicio = addMonths(inicioOriginal, i);
            nuevoFin = addMonths(finOriginal, i);
          }
          
          payloads.push({
            paciente_id: formData.paciente_id,
            auxiliar_id: formData.auxiliar_id,
            fecha_inicio: format(nuevoInicio, "yyyy-MM-dd'T'HH:mm"),
            fecha_fin: format(nuevoFin, "yyyy-MM-dd'T'HH:mm"),
            tipo_turno: formData.tipo_turno,
          });
        }
      }

      const { error } = await supabase.from("turnos_cronograma").insert(payloads);
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
      }
    }
  };

  const endDate = addDays(startDate, 6);
  const startMonth = format(startDate, "MMMM", { locale: es });
  const endMonth = format(endDate, "MMMM", { locale: es });
  const startYear = format(startDate, "yyyy");
  const endYear = format(endDate, "yyyy");
  const headerLabel = startMonth === endMonth 
    ? format(startDate, "MMMM yyyy", { locale: es })
    : startYear === endYear 
      ? `${startMonth} - ${endMonth} ${startYear}`
      : `${startMonth} ${startYear} - ${endMonth} ${endYear}`;

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
      {/* Leyenda de Colores */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pacientes (Color de Tarjeta):</span>
          <div className="flex flex-wrap gap-2">
            {pacientes.map((p) => {
              const colors = getPatientColor(p.id, pacientes);
              return (
                <span key={p.id} className="px-3 py-1 rounded-full text-xs font-semibold border" style={colors.style}>
                  {p.nombre_completo}
                </span>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Auxiliares (Tarjeta Pequeña):</span>
          <div className="flex flex-wrap gap-2">
            {auxiliares.map((a) => {
              const colors = getAuxiliarColor(a.id, auxiliares);
              return (
                <span key={a.id} className="px-3 py-1 rounded-full text-xs font-semibold border" style={colors.style}>
                  {a.nombre}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Controles del calendario */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <button onClick={handlePrevWeek} className="p-2 hover:bg-gray-200 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-gray-700 capitalize">
            {headerLabel}
          </h2>
          <button onClick={handleNextWeek} className="p-2 hover:bg-gray-200 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Cuadrícula en formato Matriz (Filas: Pacientes, Columnas: Días) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border-t border-gray-100 min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-medium">
                <th className="p-4 border-r border-gray-100 w-1/8 font-bold text-gray-700">Paciente</th>
                {weekDays.map((day, i) => (
                  <th key={i} className="p-3 text-center border-r border-gray-100 bg-gray-50 w-1/8">
                    <p className="text-xs font-semibold text-gray-500 capitalize">{format(day, "EEEE", { locale: es })}</p>
                    <p className={`text-lg font-bold mt-0.5 ${isSameDay(day, new Date()) ? 'text-[#2B6CB0]' : 'text-gray-800'}`}>
                      {format(day, "d")}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pacientes.map((p) => {
                const pColors = getPatientColor(p.id, pacientes);
                return (
                  <tr key={p.id} className="hover:bg-gray-50/10 transition-colors">
                    {/* Nombre del Paciente */}
                    <td className="p-4 border-r border-gray-100 font-bold align-middle w-1/8" style={{ ...pColors.style, borderLeft: `5px solid ${pColors.style.borderColor}` }}>
                      <span className="block text-sm leading-snug">{p.nombre_completo}</span>
                    </td>
                    
                    {/* Días de la semana */}
                    {weekDays.map((day, dIdx) => {
                      const turnosDelDia = turnos.filter((t) => {
                        if (t.paciente_id !== p.id) return false;
                        
                        const fechaDia = new Date(day);
                        fechaDia.setHours(0, 0, 0, 0);
                        
                        const inicio = new Date(t.fecha_inicio);
                        inicio.setHours(0, 0, 0, 0);
                        
                        const fin = new Date(t.fecha_fin);
                        fin.setHours(23, 59, 59, 999);
                        
                        return fechaDia >= inicio && fechaDia <= fin;
                      });

                      return (
                        <td key={dIdx} className="p-2.5 border-r border-gray-100 align-top w-1/8 min-w-[120px]">
                          <div className="space-y-2">
                            {turnosDelDia.map((t) => {
                              const aColors = getAuxiliarColor(t.auxiliar_id, auxiliares);
                              return (
                                <div 
                                  key={t.id} 
                                  onClick={() => handleOpenModal(t)}
                                  className="p-2 rounded-xl text-[11px] border cursor-pointer hover:shadow-md transition-all bg-white"
                                  style={{ borderColor: aColors.style.borderColor }}
                                >
                                  <div className="mb-1">
                                    <span className="inline-block px-2 py-0.5 rounded-md font-semibold text-[9px] truncate max-w-full" style={aColors.style}>
                                      {t.profiles?.nombre || 'Auxiliar Desconocido'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[9px] font-medium text-gray-500">
                                    <Clock className="w-2.5 h-2.5 text-gray-400" />
                                    <span>
                                      {t.fecha_inicio.includes('T') ? t.fecha_inicio.split('T')[1].substring(0,5) : t.fecha_inicio} ({t.tipo_turno})
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                            {turnosDelDia.length === 0 && (
                              <div className="py-3 border border-dashed border-gray-100 rounded-xl flex items-center justify-center text-[9px] text-gray-300 font-medium">
                                Sin turno
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
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
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repetir turno</label>
                  <select 
                    value={formData.repetir} 
                    onChange={(e) => setFormData({...formData, repetir: e.target.value})} 
                    className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5] bg-white text-sm"
                  >
                    <option value="ninguno">No repetir</option>
                    <option value="semanal">Semanalmente</option>
                    <option value="mensual">Mensualmente</option>
                  </select>
                </div>
                {formData.repetir !== "ninguno" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Veces ({formData.repetir === 'semanal' ? 'semanas' : 'meses'})
                    </label>
                    <input 
                      type="number" 
                      min="1" 
                      max="52" 
                      value={formData.repetir_cant} 
                      onChange={(e) => setFormData({...formData, repetir_cant: e.target.value})} 
                      className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5] text-sm" 
                    />
                  </div>
                )}
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
