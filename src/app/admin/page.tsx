"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Users, UserSquare2, CalendarDays, Activity, AlertTriangle } from "lucide-react";
import { startOfDay, endOfDay, subHours } from "date-fns";

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState({
    pacientes: 0,
    auxiliares: 0,
    turnosHoy: 0,
  });
  const [actividadReciente, setActividadReciente] = useState<any[]>([]);
  const [alertasRecientes, setAlertasRecientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    setConnectionError(false);
    try {
        const { count: pacientesCount } = await supabase.from("pacientes").select("*", { count: "exact", head: true });
        const { count: auxiliaresCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("rol", "auxiliar");
        
        const hoy = new Date();
        const { count: turnosCount } = await supabase
          .from("turnos_cronograma")
          .select("*", { count: "exact", head: true })
          .gte("fecha_inicio", startOfDay(hoy).toISOString())
          .lte("fecha_inicio", endOfDay(hoy).toISOString());

        setMetrics({
          pacientes: pacientesCount || 0,
          auxiliares: auxiliaresCount || 0,
          turnosHoy: turnosCount || 0,
        });

        // Cargar últimos registros clínicos
        const { data: recientes } = await supabase
          .from("registros_clinicos")
          .select("*, pacientes(nombre_completo), profiles(nombre)")
          .order("created_at", { ascending: false })
          .limit(5);

        if (recientes) setActividadReciente(recientes);

        // Cargar alertas (últimas 24h)
        const hace24h = subHours(new Date(), 24).toISOString();
        const { data: signosRecientes } = await supabase
          .from("registros_clinicos")
          .select("*, pacientes(nombre_completo), profiles(nombre, telefono)")
          .eq("tipo_registro", "signos_vitales")
          .gte("created_at", hace24h)
          .order("created_at", { ascending: false });

        if (signosRecientes) {
          const alertas = signosRecientes.filter(s => s.datos && s.datos.alerta === true);
          setAlertasRecientes(alertas);
        }

      } catch (error) {
        console.error("Error fetching metrics:", error);
        setConnectionError(true);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchMetrics();

    // Suscripción Realtime a registros_clinicos
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'registros_clinicos' },
        async (payload) => {
           // Fetch the relation names to display properly
           const { data: newRecord } = await supabase
             .from("registros_clinicos")
             .select("*, pacientes(nombre_completo), profiles(nombre)")
             .eq("id", payload.new.id)
             .single();
             
           if (newRecord) {
             setActividadReciente((prev) => [newRecord, ...prev].slice(0, 5));
             
             if (newRecord.tipo_registro === "signos_vitales" && newRecord.datos?.alerta === true) {
               setAlertasRecientes((prev) => [newRecord, ...prev]);
             }
           }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const statCards = [
    { title: "Pacientes Registrados", value: metrics.pacientes, icon: Users, color: "bg-blue-100 text-[#2B6CB0]", href: "/admin/pacientes" },
    { title: "Auxiliares Activos", value: metrics.auxiliares, icon: UserSquare2, color: "bg-teal-100 text-[#4FD1C5]", href: "/admin/auxiliares" },
    { title: "Turnos Programados Hoy", value: metrics.turnosHoy, icon: CalendarDays, color: "bg-purple-100 text-purple-600", href: "/admin/cronograma" },
  ];

  if (connectionError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 animate-in fade-in duration-500">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold text-gray-800">Error de conexión</h2>
        <p className="text-gray-500 text-center max-w-md">No se pudo establecer conexión con el servidor. Por favor, verifica la conexión o intenta nuevamente.</p>
        <button 
          onClick={fetchMetrics} 
          className="px-6 py-2 bg-[#2B6CB0] text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Reintentar conexión
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">Métricas y resumen general de Cuidado Nonnas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, i) => (
          <Link 
            href={stat.href} 
            key={i} 
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer block"
          >
            <div className={`p-4 rounded-xl ${stat.color}`}>
              <stat.icon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">{stat.title}</p>
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
              ) : (
                <h3 className="text-3xl font-bold text-gray-800">{stat.value}</h3>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Alertas de Salud */}
      {alertasRecientes.length > 0 && (
        <div className="bg-red-50 rounded-2xl shadow-sm border border-red-200 p-6 mt-8 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="text-red-600 w-7 h-7 animate-pulse" />
            <h2 className="text-2xl font-bold text-red-700">Alertas de Salud Recientes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alertasRecientes.map(alerta => (
              <div key={alerta.id} className="bg-white border-l-4 border-l-red-500 p-4 rounded-xl shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-800 text-lg">
                    {alerta.pacientes?.nombre_completo || 'Paciente Desconocido'}
                  </h3>
                  <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-1 rounded-md">
                    Hace {Math.round((new Date().getTime() - new Date(alerta.created_at).getTime()) / 60000)} min
                  </span>
                </div>
                <p className="text-red-600 font-medium mb-3">
                  ⚠️ {alerta.datos?.detalles_alerta}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500 border-t pt-3">
                  <span>Reportado por: {alerta.profiles?.nombre || 'Auxiliar'}</span>
                  <div className="flex gap-2">
                    <button className="text-blue-600 hover:underline font-medium">Ver Datos</button>
                    <a href={`tel:${alerta.profiles?.telefono || ''}`} className="text-red-600 hover:underline font-medium">Llamar Auxiliar</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actividad en Tiempo Real */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-8">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="text-[#4FD1C5] w-6 h-6" />
          <h2 className="text-xl font-bold text-gray-800">Actividad Clínica en Tiempo Real</h2>
          <span className="relative flex h-3 w-3 ml-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
          </span>
        </div>
        
        <div className="space-y-4">
          {actividadReciente.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay actividad reciente registrada.</p>
          ) : (
            actividadReciente.map((act) => (
              <div key={act.id} className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50 animate-in slide-in-from-left-4 duration-300">
                <div className="bg-[#2B6CB0]/10 p-2 rounded-lg text-[#2B6CB0]">
                   <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    <span className="capitalize">{act.tipo_registro.replace('_', ' ')}</span>
                    <span className="text-gray-500 font-normal ml-2">guardado por {act.profiles?.nombre || 'Auxiliar'}</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Paciente: <span className="font-medium text-[#2B6CB0]">{act.pacientes?.nombre_completo || 'Desconocido'}</span></p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(act.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
