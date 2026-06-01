"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Clock, ChevronLeft, ChevronRight, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { 
  format, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  addDays, 
  subDays, 
  addWeeks, 
  subWeeks, 
  addMonths, 
  subMonths 
} from "date-fns";
import { es } from "date-fns/locale";

type PeriodoType = "diaria" | "semanal" | "mensual";

interface TurnoDetalle {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  paciente_nombre: string;
  horas: number;
}

interface ResumenAuxiliar {
  auxiliar_id: string;
  auxiliar_nombre: string;
  total_horas: number;
  total_turnos: number;
  turnos: TurnoDetalle[];
}

export default function ReporteHorasPage() {
  const [periodo, setPeriodo] = useState<PeriodoType>("mensual");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [resumen, setResumen] = useState<ResumenAuxiliar[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [periodo, currentDate]);

  const fetchData = async () => {
    setLoading(true);
    let start: Date, end: Date;

    if (periodo === "diaria") {
      start = startOfDay(currentDate);
      end = endOfDay(currentDate);
    } else if (periodo === "semanal") {
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    }

    try {
      const { data: turnos, error: turnosError } = await supabase
        .from("turnos_cronograma")
        .select(`
          id, 
          fecha_inicio, 
          fecha_fin, 
          auxiliar_id, 
          paciente_id,
          pacientes:paciente_id (nombre_completo)
        `)
        .gte("fecha_inicio", start.toISOString())
        .lte("fecha_inicio", end.toISOString())
        .not("fecha_fin", "is", null);

      if (turnosError) throw turnosError;

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, nombre_completo, nombre, rol");

      if (profilesError) throw profilesError;

      const turnosConPerfiles = turnos?.map(turno => {
        const perfilAuxiliar = profiles?.find(p => p.id === turno.auxiliar_id);
        return {
          ...turno,
          profiles: perfilAuxiliar || null
        };
      }) || [];

      // Agrupar por auxiliar
      const agrupado = new Map<string, ResumenAuxiliar>();

      turnosConPerfiles.forEach(t => {
        if (!t.fecha_fin || !t.fecha_inicio) return;
        
        const fInicio = new Date(t.fecha_inicio);
        const fFin = new Date(t.fecha_fin);
        const horas = (fFin.getTime() - fInicio.getTime()) / (1000 * 60 * 60);
        
        if (horas <= 0) return; // Ignorar turnos anómalos

        const auxId = t.auxiliar_id;
        const auxProfile: any = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
        const nombreAux = auxProfile?.nombre_completo || auxProfile?.nombre || "Desconocido";
        
        const pacienteObj: any = Array.isArray(t.pacientes) ? t.pacientes[0] : t.pacientes;
        const nombrePaciente = pacienteObj?.nombre_completo || "Paciente Desconocido";

        if (!agrupado.has(auxId)) {
          agrupado.set(auxId, {
            auxiliar_id: auxId,
            auxiliar_nombre: nombreAux,
            total_horas: 0,
            total_turnos: 0,
            turnos: []
          });
        }

        const res = agrupado.get(auxId)!;
        res.total_horas += horas;
        res.total_turnos += 1;
        res.turnos.push({
          id: t.id,
          fecha_inicio: t.fecha_inicio,
          fecha_fin: t.fecha_fin,
          paciente_nombre: nombrePaciente,
          horas: horas
        });
      });

      // Convertir a array y ordenar los turnos internos por fecha
      const resultArray = Array.from(agrupado.values());
      resultArray.forEach(r => {
        r.turnos.sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime());
      });
      // Ordenar por nombre del auxiliar
      resultArray.sort((a, b) => a.auxiliar_nombre.localeCompare(b.auxiliar_nombre));

      setResumen(resultArray);
    } catch (error) {
      console.error("Error fetching horas", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    if (periodo === "diaria") setCurrentDate(subDays(currentDate, 1));
    else if (periodo === "semanal") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNext = () => {
    if (periodo === "diaria") setCurrentDate(addDays(currentDate, 1));
    else if (periodo === "semanal") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  const getLabelFechas = () => {
    if (periodo === "diaria") {
      return format(currentDate, "EEEE d 'de' MMMM, yyyy", { locale: es });
    } else if (periodo === "semanal") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, "d MMM", { locale: es })} - ${format(end, "d MMM, yyyy", { locale: es })}`;
    } else {
      return format(currentDate, "MMMM yyyy", { locale: es });
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
             <Clock className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Reporte de Horas</h1>
            <p className="text-gray-500 mt-1">Control de horas trabajadas por auxiliar</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex bg-white rounded-xl shadow-sm border p-1">
          <button 
            onClick={() => setPeriodo("diaria")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${periodo === "diaria" ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Diaria
          </button>
          <button 
            onClick={() => setPeriodo("semanal")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${periodo === "semanal" ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Semanal
          </button>
          <button 
            onClick={() => setPeriodo("mensual")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${periodo === "mensual" ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Mensual
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        
        {/* Controles de Fecha */}
        <div className="flex items-center justify-between mb-8 bg-gray-50 p-4 rounded-xl">
          <button onClick={handlePrev} className="p-2 bg-white rounded-full shadow hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2 font-bold text-lg text-gray-700 capitalize">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            {getLabelFechas()}
          </div>
          <button onClick={handleNext} className="p-2 bg-white rounded-full shadow hover:bg-gray-100 transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-center text-gray-500 py-10">Calculando horas...</p>
          ) : resumen.length === 0 ? (
            <p className="text-center text-gray-500 py-10">No hay turnos registrados en este período.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm border-b">
                  <th className="p-4 rounded-tl-xl font-semibold">Auxiliar</th>
                  <th className="p-4 font-semibold text-center">Turnos Realizados</th>
                  <th className="p-4 rounded-tr-xl font-semibold text-right">Total Horas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resumen.map((row) => {
                  const isExpanded = expandedRows.includes(row.auxiliar_id);
                  return (
                    <React.Fragment key={row.auxiliar_id}>
                      <tr 
                        onClick={() => toggleRow(row.auxiliar_id)}
                        className={`hover:bg-blue-50 cursor-pointer transition-colors ${isExpanded ? "bg-blue-50/50" : ""}`}
                      >
                        <td className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                            {row.auxiliar_nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{row.auxiliar_nombre}</p>
                            <p className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                            </p>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-gray-100 px-3 py-1 rounded-full text-gray-700 font-medium text-sm">
                            {row.total_turnos} turnos
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-lg text-gray-800">
                          {row.total_horas.toFixed(2)} hrs
                        </td>
                      </tr>
                      
                      {/* Desglose */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={3} className="p-0 border-b-2 border-blue-100">
                            <div className="bg-gray-50 px-6 py-4 animate-in slide-in-from-top-2">
                              <h4 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">Detalle de Turnos</h4>
                              <div className="space-y-2">
                                {row.turnos.map((t, idx) => (
                                  <div key={t.id || idx} className="bg-white p-3 rounded-lg border shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-2">
                                    <div className="flex items-center gap-4">
                                      <div className="bg-gray-100 px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 text-center min-w-[80px]">
                                        {format(new Date(t.fecha_inicio), "dd MMM", { locale: es })}
                                      </div>
                                      <div>
                                        <p className="font-semibold text-gray-800 text-sm">{t.paciente_nombre}</p>
                                        <p className="text-xs text-gray-500">
                                          {format(new Date(t.fecha_inicio), "HH:mm")} - {format(new Date(t.fecha_fin), "HH:mm")}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-md text-sm whitespace-nowrap md:self-auto self-end">
                                      {t.horas.toFixed(2)} hrs
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
