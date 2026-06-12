"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ClipboardList, User, CalendarDays, Download, Clock, Activity, Pill, Droplet, Droplets } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import NotasEnfermeriaModal from "@/components/NotasEnfermeriaModal";
import SignosVitalesModal from "@/components/SignosVitalesModal";
import MedicamentosAdminModal from "@/components/MedicamentosAdminModal";
import DiuresisDeposicionesModal from "@/components/DiuresisDeposicionesModal";
import GlucometriaModal from "@/components/GlucometriaModal";

export default function AdminHistoriasPage() {
  const [historias, setHistorias] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<"semana" | "mes" | "todo">("todo");
  const [loading, setLoading] = useState(true);
  const [isNotasModalOpen, setIsNotasModalOpen] = useState(false);
  const [isSignosModalOpen, setIsSignosModalOpen] = useState(false);
  const [isMedicamentosModalOpen, setIsMedicamentosModalOpen] = useState(false);
  const [isDiuresisModalOpen, setIsDiuresisModalOpen] = useState(false);
  const [isGlucometriaModalOpen, setIsGlucometriaModalOpen] = useState(false);

  useEffect(() => {
    async function fetchPacientes() {
      try {
        const { data } = await supabase
          .from("pacientes")
          .select("*")
          .order("nombre_completo", { ascending: true });
          
        if (data && data.length > 0) {
          setPacientes(data);
          setSelectedPacienteId(data[0].id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error al cargar pacientes", err);
        setLoading(false);
      }
    }
    fetchPacientes();
  }, []);

  useEffect(() => {
    if (!selectedPacienteId) return;
    
    async function fetchHistorias() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const res = await fetch(`/api/get-historias?paciente_id=${selectedPacienteId}`, {
          headers: {
            "Authorization": `Bearer ${session.access_token}`
          }
        });
        const data = await res.json();
        
        if (data.success) {
          setHistorias(data.data);
        }
      } catch (err) {
        console.error("Error al cargar historias", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchHistorias();
  }, [selectedPacienteId]);

  const handleExportPDF = async () => {
    if (!selectedPacienteId) return;
    const paciente = pacientes.find(p => p.id === selectedPacienteId);
    if (!paciente) return;

    let dateFilter = new Date(0);
    const now = new Date();
    if (dateRange === "semana") {
      dateFilter = new Date();
      dateFilter.setDate(now.getDate() - 7);
    } else if (dateRange === "mes") {
      dateFilter = new Date();
      dateFilter.setMonth(now.getMonth() - 1);
    }

    const historiasFiltradas = historias.filter(h => new Date(h.created_at) >= dateFilter);

    const { data: signos } = await supabase
      .from("registros_clinicos")
      .select("*, profiles(nombre_completo, nombre)")
      .eq("paciente_id", selectedPacienteId)
      .eq("tipo_registro", "signos_vitales")
      .gte("created_at", dateFilter.toISOString())
      .order("created_at", { ascending: true });

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Reporte Médico del Paciente", 14, 20);
    doc.setFontSize(12);
    doc.text(`Paciente: ${paciente.nombre_completo}`, 14, 30);
    doc.text(`Rango del reporte: ${dateRange === 'todo' ? 'Historial Completo' : dateRange === 'mes' ? 'Último Mes' : 'Última Semana'}`, 14, 38);
    doc.text(`Fecha de emisión: ${now.toLocaleDateString()}`, 14, 46);

    let currentY = 55;

    // Tabla Signos Vitales
    if (signos && signos.length > 0) {
      doc.setFontSize(14);
      doc.text("Historial de Signos Vitales", 14, currentY);
      
      const head = [["Fecha", "Hora", "PAS", "PAD", "Pulso", "SpO2", "Temp", "Auxiliar"]];
      const body = signos.map(s => {
        const d = new Date(s.created_at);
        return [
          d.toLocaleDateString(),
          d.toLocaleTimeString(),
          s.datos.pas || '-',
          s.datos.pad || '-',
          s.datos.fc || '-',
          s.datos.spo2 || '-',
          s.datos.temp || '-',
          s.profiles?.nombre_completo || s.profiles?.nombre || 'Auxiliar'
        ];
      });

      (doc as any).autoTable({
        startY: currentY + 5,
        head,
        body,
        theme: 'grid',
        headStyles: { fillColor: [43, 108, 176] }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Tabla Evoluciones
    if (historiasFiltradas && historiasFiltradas.length > 0) {
      doc.setFontSize(14);
      doc.text("Notas de Evolución Clínica", 14, currentY);

      const evHead = [["Fecha", "Auxiliar", "Nota"]];
      const evBody = historiasFiltradas.map(h => {
        const d = new Date(h.created_at);
        return [
          d.toLocaleDateString() + "\n" + d.toLocaleTimeString(),
          h.profiles?.nombre_completo || h.profiles?.nombre || 'Auxiliar',
          h.nota
        ];
      });

      (doc as any).autoTable({
        startY: currentY + 5,
        head: evHead,
        body: evBody,
        theme: 'plain',
        headStyles: { fillColor: [200, 200, 200], textColor: [0,0,0] },
        styles: { cellPadding: 3, fontSize: 9 },
        columnStyles: { 2: { cellWidth: 120 } }
      });
    }

    doc.save(`Reporte_Medico_${paciente.nombre_completo.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-xl text-purple-600">
             <ClipboardList className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Historias Clínicas</h1>
            <p className="text-gray-500 mt-1">Evoluciones y notas médicas por paciente</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Lista de pacientes */}
        <div className="md:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[70vh]">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-bold text-gray-700">Pacientes</h3>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <p className="p-4 text-gray-500 text-sm text-center">Cargando...</p>
            ) : pacientes.length === 0 ? (
              <p className="p-4 text-gray-500 text-sm text-center">No hay registros.</p>
            ) : (
              pacientes.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPacienteId(p.id)}
                  className={`w-full text-left p-4 border-b border-gray-50 transition-colors flex items-center gap-3 ${
                    selectedPacienteId === p.id ? "bg-purple-50 border-l-4 border-l-purple-500" : "hover:bg-gray-50 border-l-4 border-l-transparent"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    selectedPacienteId === p.id ? "bg-purple-200 text-purple-700" : "bg-gray-200 text-gray-600"
                  }`}>
                    {p.nombre_completo?.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className={`font-medium truncate ${selectedPacienteId === p.id ? "text-purple-900" : "text-gray-700"}`}>
                      {p.nombre_completo}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Historial cronológico */}
        <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-[70vh] flex flex-col">
          <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 whitespace-nowrap">
              <User className="w-6 h-6 text-purple-600" />
              Evolución del Paciente
            </h2>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <select 
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as "semana" | "mes" | "todo")}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="semana">Última semana</option>
                <option value="mes">Último mes</option>
                <option value="todo">Todo el historial</option>
              </select>
              <button
                onClick={() => setIsGlucometriaModalOpen(true)}
                disabled={!selectedPacienteId}
                className="flex items-center gap-2 bg-cyan-100 hover:bg-cyan-200 text-cyan-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Droplets className="w-4 h-4" />
                Glucosa / Insulina
              </button>
              <button
                onClick={() => setIsDiuresisModalOpen(true)}
                disabled={!selectedPacienteId}
                className="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Droplet className="w-4 h-4" />
                Control Esfínteres
              </button>
              <button
                onClick={() => setIsMedicamentosModalOpen(true)}
                disabled={!selectedPacienteId}
                className="flex items-center gap-2 bg-rose-100 hover:bg-rose-200 text-rose-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Pill className="w-4 h-4" />
                Fórmula Médica
              </button>
              <button
                onClick={() => setIsSignosModalOpen(true)}
                disabled={!selectedPacienteId}
                className="flex items-center gap-2 bg-teal-100 hover:bg-teal-200 text-teal-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Activity className="w-4 h-4" />
                Signos Vitales
              </button>
              <button
                onClick={() => setIsNotasModalOpen(true)}
                disabled={!selectedPacienteId}
                className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Clock className="w-4 h-4" />
                Notas de Enfermería
              </button>
              <button
                onClick={handleExportPDF}
                disabled={!selectedPacienteId || historias.length === 0}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Exportar Reporte (PDF)
              </button>
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 pr-2 space-y-6">
            {loading ? (
              <p className="text-gray-500 text-center">Cargando historias...</p>
            ) : !selectedPacienteId ? (
              <p className="text-gray-500 text-center">Selecciona un paciente para ver su historia clínica.</p>
            ) : historias.length === 0 ? (
              <p className="text-gray-500 text-center">Este paciente aún no tiene notas de evolución registradas.</p>
            ) : (
              historias.map((historia, i) => (
                <div key={historia.id} className="relative pl-8 before:absolute before:left-[11px] before:top-8 before:bottom-[-24px] before:w-0.5 before:bg-gray-200 last:before:hidden">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-purple-100 border-2 border-purple-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-medium text-purple-700 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" />
                        {historia.created_at ? format(new Date(historia.created_at), "PPP 'a las' p", { locale: es }) : "Fecha desconocida"}
                      </p>
                      <span className="text-xs bg-white px-2 py-1 rounded-full border font-medium text-gray-600 shadow-sm">
                        {historia.profiles?.nombre_completo || historia.profiles?.nombre || "Auxiliar"}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{historia.nota}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {isNotasModalOpen && selectedPacienteId && (
        <NotasEnfermeriaModal 
          pacienteId={selectedPacienteId}
          pacienteNombre={pacientes.find(p => p.id === selectedPacienteId)?.nombre_completo || "Paciente"}
          onClose={() => setIsNotasModalOpen(false)}
        />
      )}

      {isSignosModalOpen && selectedPacienteId && (
        <SignosVitalesModal 
          pacienteId={selectedPacienteId}
          pacienteNombre={pacientes.find(p => p.id === selectedPacienteId)?.nombre_completo || "Paciente"}
          onClose={() => setIsSignosModalOpen(false)}
        />
      )}

      {isMedicamentosModalOpen && selectedPacienteId && (
        <MedicamentosAdminModal 
          pacienteId={selectedPacienteId}
          pacienteNombre={pacientes.find(p => p.id === selectedPacienteId)?.nombre_completo || "Paciente"}
          onClose={() => setIsMedicamentosModalOpen(false)}
        />
      )}

      {isDiuresisModalOpen && selectedPacienteId && (
        <DiuresisDeposicionesModal 
          pacienteId={selectedPacienteId}
          pacienteNombre={pacientes.find(p => p.id === selectedPacienteId)?.nombre_completo || "Paciente"}
          onClose={() => setIsDiuresisModalOpen(false)}
        />
      )}

      {isGlucometriaModalOpen && selectedPacienteId && (
        <GlucometriaModal 
          pacienteId={selectedPacienteId}
          pacienteNombre={pacientes.find(p => p.id === selectedPacienteId)?.nombre_completo || "Paciente"}
          onClose={() => setIsGlucometriaModalOpen(false)}
        />
      )}
    </div>
  );
}
