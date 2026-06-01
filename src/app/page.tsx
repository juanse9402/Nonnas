"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import SignatureCanvas from "react-signature-canvas";
import { User, Activity, Droplet, Pill, FileText, CheckCircle, LogOut, MessageSquare, ClipboardList, ChevronLeft, BookOpen, AlertCircle, PhoneCall, WifiOff, Mic } from "lucide-react";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabaseClient";
import { saveOfflineRecord, syncOfflineRecords, getOfflineRecords } from "@/lib/offlineSync";
import { evaluateVitals } from "@/lib/alertas";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

const weightData = [
  { name: "Ene", peso: 68 },
  { name: "Feb", peso: 68.5 },
  { name: "Mar", peso: 67 },
  { name: "Abr", peso: 67.2 },
  { name: "May", peso: 66.8 },
];

export default function AuxiliarDashboard() {
  const router = useRouter();
  const sigCanvasOut = useRef<SignatureCanvas>(null);
  const sigCanvasIn = useRef<SignatureCanvas>(null);
  const sigCanvasCheckIn = useRef<SignatureCanvas>(null);
  
  // Auth & Data states
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTurn, setActiveTurn] = useState<any>(null);
  const [medicamentos, setMedicamentos] = useState<any[]>([]);
  const [reportes, setReportes] = useState<any[]>([]);

  // View & Form states
  const [activeView, setActiveView] = useState("home");
  
  // Form Data
  const [signos, setSignos] = useState({ pas: "", pad: "", fc: "", temp: "", spo2: "" });
  const [glucose, setGlucose] = useState("");
  const [glucoseTime, setGlucoseTime] = useState("antes");
  const [liquidos, setLiquidos] = useState({ ingresos: "", egresos: "" });
  const [notes, setNotes] = useState("");
  const [historiasClinicas, setHistoriasClinicas] = useState<any[]>([]);
  const [nuevaEvolucion, setNuevaEvolucion] = useState("");
  const [nuevoPeso, setNuevoPeso] = useState("");
  const [historialPeso, setHistorialPeso] = useState<any[]>([]);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [listeningField, setListeningField] = useState<'notes' | 'evolucion' | null>(null);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    setPendingSyncCount(getOfflineRecords().length);

    const handleOnline = async () => {
      setIsOffline(false);
      const res = await syncOfflineRecords(supabase);
      if (res.success && res.syncedCount > 0) {
        alert(`${res.syncedCount} registros sincronizados exitosamente con la nube.`);
      }
      setPendingSyncCount(res.remaining || 0);
      if (res.success && activeTurn) {
        fetchReportes(activeTurn.id);
        fetchHistorialPeso(activeTurn.pacientes.id);
      }
    };

    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [activeTurn]);
  
  useEffect(() => {
    async function checkAuthAndTurn() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setCurrentUser(session.user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (profile) {
        const now = new Date().toISOString();
        const { data: turnos } = await supabase
          .from("turnos_cronograma")
          .select("*, pacientes(*)")
          .eq("auxiliar_id", profile.id)
          .lte("fecha_inicio", now)
          .gte("fecha_fin", now)
          .single();

        if (turnos) {
          setActiveTurn(turnos);
          fetchReportes(turnos.id);
          fetchHistorialPeso(turnos.pacientes.id);
          // Simularemos medicamentos por ahora, idealmente leer de tabla medicamentos_paciente
          setMedicamentos([
            { id: 1, med: "Losartán 50mg", time: "08:00 AM", entregado: false },
            { id: 2, med: "Metformina 850mg", time: "08:00 AM", entregado: false },
            { id: 3, med: "Omeprazol 20mg", time: "02:00 PM", entregado: false }
          ]);
          
          try {
            const res = await fetch("/api/get-historias", {
              headers: { "Authorization": `Bearer ${session.access_token}` }
            });
            const hData = await res.json();
            if (hData.success) setHistoriasClinicas(hData.data);
          } catch (e) { console.error("Error fetching historias", e); }
        }
      }
      setLoading(false);
    }
    checkAuthAndTurn();
  }, [router]);

  const fetchReportes = async (turnoId: string) => {
    const { data } = await supabase
      .from("registros_clinicos")
      .select("*")
      .eq("turno_id", turnoId)
      .order("created_at", { ascending: false });
    if (data) setReportes(data);
  };

  const fetchHistorialPeso = async (pacienteId: string) => {
    const { data } = await supabase
      .from("registros_clinicos")
      .select("*")
      .eq("paciente_id", pacienteId)
      .eq("tipo_registro", "peso")
      .order("created_at", { ascending: true });
    
    if (data) {
      const formatted = data.map(d => ({
        name: new Date(d.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        peso: Number(d.datos.peso)
      }));
      setHistorialPeso(formatted);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const clearSigs = () => {
    sigCanvasOut.current?.clear();
    sigCanvasIn.current?.clear();
  };

  const handleSavePeso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTurn || !nuevoPeso) return;
    const payload = {
      turno_id: activeTurn.id,
      paciente_id: activeTurn.pacientes.id,
      auxiliar_id: currentUser.id,
      tipo_registro: "peso",
      datos: { peso: nuevoPeso }
    };
    
    if (!navigator.onLine) {
      saveOfflineRecord('registro_clinico', payload);
      setPendingSyncCount(prev => prev + 1);
      alert("Estás sin conexión. El peso ha sido guardado localmente y se sincronizará luego.");
      setNuevoPeso("");
      return;
    }

    await supabase.from("registros_clinicos").insert([payload]);
    alert("Peso registrado correctamente");
    setNuevoPeso("");
    fetchHistorialPeso(activeTurn.pacientes.id);
  };

  const handleSaveSignos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTurn) return;

    // Evaluamos signos
    const evalResult = evaluateVitals(signos);

    const payload = {
      turno_id: activeTurn.id,
      paciente_id: activeTurn.pacientes.id,
      auxiliar_id: currentUser.id,
      tipo_registro: "signos_vitales",
      datos: {
        ...signos,
        alerta: evalResult.alerta,
        detalles_alerta: evalResult.detalles_alerta
      }
    };

    if (!navigator.onLine) {
      saveOfflineRecord('registro_clinico', payload);
      setPendingSyncCount(prev => prev + 1);
      alert("Estás sin conexión. Los signos vitales han sido guardados localmente.");
      setSignos({ pas: "", pad: "", fc: "", temp: "", spo2: "" });
      setActiveView("home");
      return;
    }

    await supabase.from("registros_clinicos").insert([payload]);
    
    if (evalResult.alerta) {
      alert(`Signos guardados. ATENCIÓN ANOMALÍAS DETECTADAS:\n${evalResult.detalles_alerta}`);
    } else {
      alert("Signos guardados correctamente.");
    }

    setSignos({ pas: "", pad: "", fc: "", temp: "", spo2: "" });
    setActiveView("home");
    fetchReportes(activeTurn.id);
  };

  const handleSaveActividades = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTurn) return;
    const payload = {
      turno_id: activeTurn.id,
      paciente_id: activeTurn.pacientes.id,
      auxiliar_id: currentUser.id,
      tipo_registro: "actividades",
      datos: { glucosa: glucose, tiempo_glucosa: glucoseTime, liquidos }
    };

    if (!navigator.onLine) {
      saveOfflineRecord('registro_clinico', payload);
      setPendingSyncCount(prev => prev + 1);
      alert("Sin conexión. Las actividades han sido guardadas localmente.");
      setGlucose("");
      setLiquidos({ ingresos: "", egresos: "" });
      setActiveView("home");
      return;
    }

    await supabase.from("registros_clinicos").insert([payload]);
    alert("Actividades guardadas");
    setGlucose("");
    setLiquidos({ ingresos: "", egresos: "" });
    setActiveView("home");
    fetchReportes(activeTurn.id);
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTurn) return;
    if (sigCanvasOut.current?.isEmpty() || sigCanvasIn.current?.isEmpty()) {
      alert("Faltan firmas requeridas.");
      return;
    }

    if (!navigator.onLine) {
      alert("Debes tener conexión a internet para entregar tu turno de manera oficial.");
      return;
    }

    const firmaSaliente = sigCanvasOut.current?.getTrimmedCanvas().toDataURL('image/png');
    const firmaEntrante = sigCanvasIn.current?.getTrimmedCanvas().toDataURL('image/png');

    const payload = {
      hora_salida_real: new Date().toISOString(),
      notas_entrega: notes,
      firma_saliente: firmaSaliente,
      firma_entrante: firmaEntrante
    };

    const { error } = await supabase.from("turnos_cronograma")
      .update(payload)
      .eq("id", activeTurn.id);

    if (error) {
       alert("Error al finalizar turno.");
       console.error(error);
       return;
    }

    alert("Turno finalizado y entregado exitosamente.");
    clearSigs();
    setNotes("");
    setActiveTurn(null);
    setActiveView("home");
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTurn) return;
    if (sigCanvasCheckIn.current?.isEmpty()) {
      alert("Debes proveer tu firma de entrada para iniciar el turno.");
      return;
    }

    if (!navigator.onLine) {
      alert("Debes tener conexión a internet para iniciar tu turno de manera oficial.");
      return;
    }

    const firmaEntrada = sigCanvasCheckIn.current?.getTrimmedCanvas().toDataURL('image/png');
    const horaEntrada = new Date().toISOString();

    const { error } = await supabase
      .from("turnos_cronograma")
      .update({
        hora_entrada_real: horaEntrada,
        firma_entrada: firmaEntrada
      })
      .eq("id", activeTurn.id);

    if (error) {
      alert("Error al iniciar turno.");
      console.error(error);
      return;
    }

    setActiveTurn({ ...activeTurn, hora_entrada_real: horaEntrada });
    alert("Turno iniciado exitosamente.");
  };

  const handleDictation = (field: 'notes' | 'evolucion') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta el dictado por voz. Usa Chrome o Safari.");
      return;
    }

    if (listeningField === field) {
      setListeningField(null);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListeningField(field);
    };

    recognition.onresult = (event: any) => {
      const textoEscuchado = event.results[event.results.length - 1][0].transcript;
      if (field === 'notes') {
        setNotes(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + textoEscuchado);
      } else {
        setNuevaEvolucion(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + textoEscuchado);
      }
    };

    recognition.onerror = () => setListeningField(null);
    recognition.onend = () => setListeningField(null);

    recognition.start();
  };

  const handleDownloadPDF = () => {
    if (!activeTurn) return;

    const doc = new jsPDF();
    
    // Encabezado
    doc.setFontSize(18);
    doc.setTextColor(43, 108, 176);
    doc.text("Resumen de Turno", 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(`Paciente: ${activeTurn.pacientes?.nombre_completo}`, 14, 30);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 38);
    doc.text(`Auxiliar a cargo: ${currentUser?.user_metadata?.nombre || currentUser?.email || 'Auxiliar'}`, 14, 46);
    
    // Check-in Info
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Registro de Entrada (Check-In)", 14, 60);
    doc.setFontSize(10);
    doc.text(`Hora: ${new Date(activeTurn.hora_entrada_real).toLocaleTimeString()}`, 14, 68);
    if (activeTurn.firma_entrada) {
      doc.addImage(activeTurn.firma_entrada, 'PNG', 14, 70, 50, 20);
    }
    
    // Signos Vitales
    doc.setFontSize(14);
    doc.text("Signos Vitales y Actividades del Turno", 14, 100);
    
    const signosVitales = reportes.filter(r => r.tipo_registro === 'signos_vitales');
    if (signosVitales.length > 0) {
      const tableColumn = ["Hora", "P. Sistólica", "P. Diastólica", "Pulso", "SpO2", "Temp"];
      const tableRows = signosVitales.map(s => [
        new Date(s.created_at).toLocaleTimeString(),
        s.datos.pas || '-',
        s.datos.pad || '-',
        s.datos.fc || '-',
        s.datos.spo2 || '-',
        s.datos.temp || '-'
      ]);
      (doc as any).autoTable({
        startY: 105,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 209, 197] },
      });
    } else {
      doc.setFontSize(10);
      doc.text("No se registraron signos vitales en este turno.", 14, 110);
    }

    const currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : 125;

    // Notas de entrega
    doc.setFontSize(14);
    doc.text("Notas de Entrega Final", 14, currentY);
    doc.setFontSize(10);
    const splitNotes = doc.splitTextToSize(notes || "Sin notas", 180);
    doc.text(splitNotes, 14, currentY + 8);

    // Firmas de salida
    const firmasY = currentY + splitNotes.length * 5 + 20;
    doc.setFontSize(14);
    doc.text("Firmas de Cierre", 14, firmasY);
    
    doc.setFontSize(10);
    doc.text("Firma Saliente:", 14, firmasY + 10);
    if (!sigCanvasOut.current?.isEmpty()) {
      const fSaliente = sigCanvasOut.current?.getTrimmedCanvas().toDataURL('image/png');
      if (fSaliente) doc.addImage(fSaliente, 'PNG', 14, firmasY + 15, 60, 25);
    }

    doc.text("Firma Entrante:", 100, firmasY + 10);
    if (!sigCanvasIn.current?.isEmpty()) {
      const fEntrante = sigCanvasIn.current?.getTrimmedCanvas().toDataURL('image/png');
      if (fEntrante) doc.addImage(fEntrante, 'PNG', 100, firmasY + 15, 60, 25);
    }
    
    doc.save(`Resumen_Turno_${activeTurn.pacientes?.nombre_completo?.replace(/\s+/g, '_')}.pdf`);
  };

  const handleToggleMed = async (med: any) => {
    if (!activeTurn) return;
    const payload = {
      turno_id: activeTurn.id,
      paciente_id: activeTurn.pacientes.id,
      medicamento_nombre: med.med,
      hora_programada: med.time,
      entregado: true,
      entregado_por: currentUser.id
    };

    if (!navigator.onLine) {
      saveOfflineRecord('registro_medicamento', payload);
      setPendingSyncCount(prev => prev + 1);
      setMedicamentos(medicamentos.map(m => m.id === med.id ? { ...m, entregado: true } : m));
      alert(`Sin conexión. ${med.med} guardado localmente.`);
      return;
    }

    await supabase.from("registro_medicamentos_entregados").insert([payload]);
    
    // Update local state to show checked
    setMedicamentos(medicamentos.map(m => m.id === med.id ? { ...m, entregado: true } : m));
    alert(`${med.med} marcado como suministrado`);
  };

  const handleSaveEvolucion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTurn || !nuevaEvolucion.trim()) return;

    const payload = {
      paciente_id: activeTurn.pacientes.id,
      nota: nuevaEvolucion
    };

    if (!navigator.onLine) {
      saveOfflineRecord('historia_clinica', payload);
      setPendingSyncCount(prev => prev + 1);
      alert("Sin conexión. La evolución ha sido guardada localmente.");
      setNuevaEvolucion("");
      return;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    try {
      const res = await fetch("/api/save-historia", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert("Evolución guardada exitosamente");
        setNuevaEvolucion("");
        // Reload historias
        const resH = await fetch("/api/get-historias", {
          headers: { "Authorization": `Bearer ${session.access_token}` }
        });
        const hData = await resH.json();
        if (hData.success) setHistoriasClinicas(hData.data);
      } else {
        alert("Error: " + data.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F7FAFC]">Cargando...</div>;
  }

  if (!activeTurn) {
    return (
      <div className="min-h-screen bg-[#F7FAFC] p-6 text-center">
        <header className="flex justify-between items-center mb-12">
          <Logo className="w-10 h-10" />
          <button onClick={handleLogout} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <LogOut className="w-6 h-6" />
          </button>
        </header>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <CalendarList className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Sin turno activo</h2>
          <p className="text-gray-500">No tienes turnos programados para el día y hora actual.</p>
        </div>
      </div>
    );
  }

  const paciente = activeTurn.pacientes;

  const renderHomeGrid = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 space-y-4">
        <h2 className="text-2xl font-bold text-[#2B6CB0]">Bienvenido</h2>
        
        <div className="bg-gradient-to-br from-[#4FD1C5]/10 to-[#2B6CB0]/5 border border-[#4FD1C5]/30 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-gray-500 text-sm mb-1">Cuidando a:</p>
            <p className="text-[#2B6CB0] font-bold text-xl">{paciente?.nombre_completo}</p>
          </div>
          <button 
            onClick={() => setActiveView("historias")}
            className="flex items-center justify-center gap-2 bg-[#2B6CB0] hover:bg-blue-800 text-white py-3 px-5 rounded-xl font-medium transition-all shadow-md active:scale-95"
          >
            <BookOpen className="w-5 h-5" />
            Ver Historia Clínica
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { id: "perfil", icon: User, label: "Perfil" },
          { id: "signos", icon: Activity, label: "Signos vitales" },
          { id: "medicamentos", icon: Pill, label: "Medicamentos" },
          { id: "actividades", icon: ClipboardList, label: "Actividades" },
          { id: "reportes", icon: FileText, label: "Reportes" },
          { id: "mensajes", icon: MessageSquare, label: "Mensajes" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className="flex flex-col items-center justify-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-[#4FD1C5] transition-all text-[#2B6CB0] active:scale-95 gap-3"
          >
            <item.icon className="w-10 h-10" strokeWidth={1.5} />
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20 bg-[#F7FAFC] bg-[radial-gradient(#4FD1C515_1px,transparent_1px)] [background-size:20px_20px]">
      <header className="bg-white text-[#2B6CB0] p-4 sticky top-0 z-50 shadow-sm border-b flex justify-between items-center">
        {activeView !== "home" ? (
          <button onClick={() => setActiveView("home")} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
             <ChevronLeft className="w-6 h-6" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8" />
            <span className="font-bold text-xl tracking-tight">Nonnas</span>
          </div>
        )}
        
        {activeView !== "home" && <h1 className="font-bold text-lg capitalize">{activeView.replace("-", " ")}</h1>}
        <div className="flex items-center gap-2">
          {isOffline && (
            <div className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold border border-red-100">
              <WifiOff className="w-4 h-4" />
              <span className="hidden sm:inline">Sin conexión</span>
            </div>
          )}
          {pendingSyncCount > 0 && !isOffline && (
            <div className="flex items-center gap-1 bg-yellow-50 text-yellow-600 px-3 py-1 rounded-full text-xs font-bold border border-yellow-100 animate-pulse">
              <span className="hidden sm:inline">Sincronizando ({pendingSyncCount})...</span>
            </div>
          )}
          {pendingSyncCount > 0 && isOffline && (
            <div className="flex items-center gap-1 bg-yellow-50 text-yellow-600 px-2 py-1 rounded-full text-xs font-bold border border-yellow-100">
              <span>{pendingSyncCount} pend.</span>
            </div>
          )}
          <button onClick={handleLogout} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="p-5 max-w-2xl mx-auto">
        {activeTurn && !activeTurn.hora_entrada_real ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center animate-in zoom-in-95 duration-500">
            <div className="bg-[#4FD1C5]/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
               <BookOpen className="w-10 h-10 text-[#4FD1C5]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Bienvenida!</h2>
            <p className="text-gray-600 mb-6">
              Estás a punto de iniciar tu turno con <span className="font-bold text-[#2B6CB0]">{activeTurn.pacientes?.nombre_completo}</span>.
              Por favor, ingresa tu firma para confirmar tu hora de entrada oficial.
            </p>
            
            <form onSubmit={handleCheckIn} className="space-y-6 text-left">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tu firma de entrada</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 overflow-hidden relative">
                  <button type="button" onClick={() => sigCanvasCheckIn.current?.clear()} className="absolute top-2 right-2 text-xs bg-white border text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-100 z-10 shadow-sm transition-colors">Limpiar</button>
                  <SignatureCanvas ref={sigCanvasCheckIn} canvasProps={{className: "w-full h-40"}}/>
                </div>
              </div>
              <button type="submit" className="w-full py-4 px-4 rounded-xl shadow-lg text-lg font-bold text-white bg-[#2B6CB0] hover:bg-blue-800 transition-all">
                Iniciar Turno y Firmar
              </button>
            </form>
          </div>
        ) : (
          <>
            {activeView === "home" && renderHomeGrid()}

            {activeView !== "home" && (
              <div className="animate-in slide-in-from-right-8 duration-300">
            
            {activeView === "perfil" && (
              <section className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-[#4FD1C5] p-3 rounded-full text-white">
                    <User className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{paciente?.nombre_completo}</h2>
                    <p className="text-gray-500">{paciente?.edad} años</p>
                  </div>
                </div>
                
                <div className="mb-6 space-y-2">
                  <p><strong className="text-gray-700">Alergias:</strong> Ninguna registrada</p>
                  <p><strong className="text-gray-700">Diagnóstico:</strong> {paciente?.diagnostico}</p>
                  <p><strong className="text-gray-700">Peso Inicial:</strong> {paciente?.peso_inicial} kg</p>
                </div>

                <form onSubmit={handleSavePeso} className="mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row items-end gap-4">
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Registrar Peso actual (kg)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      value={nuevoPeso} 
                      onChange={e => setNuevoPeso(e.target.value)} 
                      placeholder="Ej. 68.5" 
                      className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5]" 
                      required 
                    />
                  </div>
                  <button type="submit" className="w-full sm:w-auto bg-[#2B6CB0] hover:bg-blue-800 text-white font-medium py-3 px-6 rounded-xl transition-all shadow-sm">
                    Guardar
                  </button>
                </form>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-4">Historial de Peso (kg)</h3>
                  {historialPeso.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center p-4 bg-gray-50 rounded-xl border border-dashed">No hay registros de peso aún.</p>
                  ) : (
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={historialPeso}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis domain={['dataMin - 2', 'dataMax + 2']} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Line type="monotone" dataKey="peso" stroke="#2B6CB0" strokeWidth={3} dot={{ r: 4, fill: "#4FD1C5" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeView === "signos" && (
              <form onSubmit={handleSaveSignos} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="text-[#2B6CB0] w-6 h-6" />
                  <h2 className="text-xl font-bold text-gray-800">Signos Vitales</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">P. Sistólica</label>
                      <input type="number" value={signos.pas} onChange={e => setSignos({...signos, pas: e.target.value})} placeholder="120" className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5]" required />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">P. Diastólica</label>
                      <input type="number" value={signos.pad} onChange={e => setSignos({...signos, pad: e.target.value})} placeholder="80" className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5]" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">F. Cardíaca</label>
                    <input type="number" value={signos.fc} onChange={e => setSignos({...signos, fc: e.target.value})} placeholder="75" className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5]" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Temperatura</label>
                    <input type="number" step="0.1" value={signos.temp} onChange={e => setSignos({...signos, temp: e.target.value})} placeholder="36.5" className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5]" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">SpO2 (%)</label>
                    <input type="number" value={signos.spo2} onChange={e => setSignos({...signos, spo2: e.target.value})} placeholder="98" className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5]" required />
                  </div>
                </div>
                <button type="submit" className="w-full py-4 px-4 rounded-xl shadow-lg text-lg font-bold text-white bg-[#2B6CB0] hover:bg-blue-800 transition-all">
                  Guardar Signos
                </button>
              </form>
            )}

            {activeView === "medicamentos" && (
              <section className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Pill className="text-[#2B6CB0] w-6 h-6" />
                  <h2 className="text-xl font-bold text-gray-800">Medicamentos Programados</h2>
                </div>
                <div className="space-y-4">
                  {medicamentos.map((item, i) => (
                    <label key={i} className={`flex items-center gap-4 p-4 border rounded-xl transition-colors ${item.entregado ? 'bg-green-50 border-green-200' : 'bg-gray-50 active:bg-gray-100'}`}>
                      <input 
                        type="checkbox" 
                        checked={item.entregado}
                        disabled={item.entregado}
                        onChange={() => handleToggleMed(item)}
                        className="w-6 h-6 text-green-500 border-gray-300 rounded focus:ring-green-500 disabled:opacity-50" 
                      />
                      <div className="flex-1">
                        <p className={`font-medium ${item.entregado ? 'text-green-800 line-through' : 'text-gray-800'}`}>{item.med}</p>
                        <p className={`text-sm ${item.entregado ? 'text-green-600' : 'text-gray-500'}`}>{item.time}</p>
                      </div>
                      {item.entregado && <CheckCircle className="text-green-500 w-6 h-6" />}
                    </label>
                  ))}
                </div>
              </section>
            )}

            {activeView === "actividades" && (
              <form onSubmit={handleSaveActividades} className="space-y-6">
                <section className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Droplet className="text-[#2B6CB0] w-6 h-6" />
                    <h2 className="text-xl font-bold text-gray-800">Glucosa</h2>
                  </div>
                  <div className="flex flex-col gap-4">
                    <input 
                      type="number" 
                      placeholder="Nivel (mg/dl)" 
                      value={glucose}
                      onChange={(e) => setGlucose(e.target.value)}
                      className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5]" 
                    />
                    <div className="flex rounded-xl overflow-hidden border border-gray-200">
                      <button 
                        type="button"
                        onClick={() => setGlucoseTime('antes')}
                        className={`flex-1 py-3 text-center font-medium transition-colors ${glucoseTime === 'antes' ? 'bg-[#4FD1C5] text-white' : 'bg-gray-50 text-gray-600'}`}
                      >
                        Antes
                      </button>
                      <button 
                        type="button"
                        onClick={() => setGlucoseTime('despues')}
                        className={`flex-1 py-3 text-center font-medium transition-colors ${glucoseTime === 'despues' ? 'bg-[#4FD1C5] text-white' : 'bg-gray-50 text-gray-600'}`}
                      >
                        Después
                      </button>
                    </div>
                  </div>
                </section>

                <section className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="text-[#2B6CB0] w-6 h-6" />
                    <h2 className="text-xl font-bold text-gray-800">Líquidos</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Ingresos (ml)</label>
                      <input type="number" value={liquidos.ingresos} onChange={e => setLiquidos({...liquidos, ingresos: e.target.value})} placeholder="Agua" className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5]" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Egresos (ml)</label>
                      <input type="number" value={liquidos.egresos} onChange={e => setLiquidos({...liquidos, egresos: e.target.value})} placeholder="Orina" className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5]" />
                    </div>
                  </div>
                </section>
                
                <button type="submit" className="w-full py-4 px-4 rounded-xl shadow-lg text-lg font-bold text-white bg-[#2B6CB0] hover:bg-blue-800 transition-all">
                  Guardar Actividades
                </button>
              </form>
            )}

            {activeView === "reportes" && (
              <div className="space-y-6">
                <section className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Historial del Turno</h2>
                  {reportes.length === 0 ? (
                    <p className="text-gray-500 text-center p-4">No hay registros clínicos guardados en este turno.</p>
                  ) : (
                    <div className="space-y-4">
                      {reportes.map((rep) => (
                        <div key={rep.id} className="p-4 border rounded-xl bg-gray-50 text-sm">
                          <p className="font-bold text-[#2B6CB0] capitalize mb-1">{rep.tipo_registro.replace('_', ' ')}</p>
                          <pre className="text-gray-600 whitespace-pre-wrap font-sans">{JSON.stringify(rep.datos, null, 2)}</pre>
                          <p className="text-xs text-gray-400 mt-2">{new Date(rep.created_at).toLocaleTimeString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <form onSubmit={handleSaveNotes} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="text-[#2B6CB0] w-6 h-6" />
                      <h2 className="text-xl font-bold text-gray-800">Notas de Entrega Final</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDictation('notes')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        listeningField === 'notes' 
                          ? 'bg-red-100 text-red-600 animate-pulse' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                      {listeningField === 'notes' ? 'Escuchando...' : 'Dictar con voz'}
                    </button>
                  </div>
                  <textarea 
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Bitácora descriptiva para el próximo turno..."
                    className="w-full border rounded-xl p-3 mb-6 focus:ring-[#4FD1C5] resize-none"
                    required
                  ></textarea>

                  <h3 className="font-bold text-gray-800 mb-3">Firmas Requeridas</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Tu firma (Saliente)</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 overflow-hidden">
                        <SignatureCanvas ref={sigCanvasOut} canvasProps={{className: "w-full h-32"}}/>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Auxiliar Entrante</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 overflow-hidden">
                        <SignatureCanvas ref={sigCanvasIn} canvasProps={{className: "w-full h-32"}}/>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 mt-6">
                    <button type="submit" className="w-full py-4 px-4 rounded-xl shadow-lg text-lg font-bold text-white bg-[#4FD1C5] hover:bg-teal-500 transition-all">
                      Finalizar y Entregar Turno
                    </button>
                    <button type="button" onClick={handleDownloadPDF} className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-bold bg-white hover:bg-gray-50 transition-all flex justify-center items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Descargar Resumen de Turno (PDF)
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeView === "mensajes" && (
               <section className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 text-center py-12">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-600">No hay mensajes nuevos</h2>
               </section>
            )}

            {activeView === "historias" && (
              <div className="space-y-6">
                <section className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="text-[#2B6CB0] w-6 h-6" />
                    <h2 className="text-xl font-bold text-gray-800">Historias Clínicas Anteriores</h2>
                  </div>
                  {historiasClinicas.length === 0 ? (
                    <p className="text-gray-500 text-center p-4">No hay notas de evolución anteriores para este paciente.</p>
                  ) : (
                    <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                      {historiasClinicas.map((h) => (
                        <div key={h.id} className="p-4 border rounded-xl bg-gray-50 text-sm">
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-bold text-[#2B6CB0]">{new Date(h.created_at).toLocaleDateString()}</p>
                            <span className="text-xs bg-white px-2 py-1 rounded-full border text-gray-600">
                              {h.profiles?.nombre_completo || h.profiles?.nombre || "Auxiliar"}
                            </span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{h.nota}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <form onSubmit={handleSaveEvolucion} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Registrar Nueva Evolución</h3>
                    <button
                      type="button"
                      onClick={() => handleDictation('evolucion')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        listeningField === 'evolucion' 
                          ? 'bg-red-100 text-red-600 animate-pulse' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                      {listeningField === 'evolucion' ? 'Escuchando...' : 'Dictar con voz'}
                    </button>
                  </div>
                  <textarea 
                    rows={5}
                    value={nuevaEvolucion}
                    onChange={(e) => setNuevaEvolucion(e.target.value)}
                    placeholder="Escribe la evolución del paciente durante el turno..."
                    className="w-full border rounded-xl p-3 mb-4 focus:ring-[#4FD1C5] resize-none"
                    required
                  ></textarea>
                  <button type="submit" className="w-full py-4 px-4 rounded-xl shadow-lg text-lg font-bold text-white bg-[#2B6CB0] hover:bg-blue-800 transition-all">
                    Guardar Evolución
                  </button>
                </form>
              </div>
            )}

          </div>
        )}
        </>
        )}

        {/* Emergency Button */}
      </main>

      {/* Botón Flotante de Emergencia */}
      {activeTurn && (
        <button
          onClick={() => setShowEmergencyModal(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-red-700 hover:scale-105 active:scale-95 transition-all z-40"
        >
          <AlertCircle className="w-8 h-8 animate-pulse" />
        </button>
      )}

      {/* Modal de Emergencia */}
      {showEmergencyModal && activeTurn && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-red-700 mb-2">
                ¿Deseas reportar una emergencia para {activeTurn.pacientes.nombre_completo}?
              </h2>
              <p className="text-red-500/80 text-sm">Esta acción te permitirá contactar rápidamente para pedir ayuda.</p>
            </div>
            
            <div className="p-6 space-y-4">
              <a 
                href="tel:112"
                className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white py-4 px-4 rounded-2xl font-bold text-lg transition-all shadow-md active:scale-95"
              >
                <PhoneCall className="w-6 h-6" />
                Llamar a Emergencias (112)
              </a>
              
              <a 
                href={`tel:${activeTurn.pacientes.telefono_responsable || ''}`}
                className="w-full flex items-center justify-center gap-3 bg-[#2B6CB0] hover:bg-blue-800 text-white py-4 px-4 rounded-2xl font-bold text-lg transition-all shadow-md active:scale-95"
              >
                <PhoneCall className="w-6 h-6" />
                Llamar a {activeTurn.pacientes.nombre_responsable || 'Responsable'}
              </a>

              <button 
                onClick={() => setShowEmergencyModal(false)}
                className="w-full mt-2 py-3 px-4 rounded-xl text-gray-500 font-medium hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Para usar CalendarList icon si no se importó de lucide-react
import { CalendarDays as CalendarList } from "lucide-react";
