"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Edit2, Trash2, X } from "lucide-react";

type Paciente = {
  id: string;
  nombre_completo: string;
  edad: number;
  peso_inicial: number;
  diagnostico: string;
  direccion: string;
  contacto_emergencia: string;
  nombre_responsable?: string;
};

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nombre_completo: "",
    edad: "",
    peso_inicial: "",
    diagnostico: "",
    direccion: "",
    contacto_emergencia: "",
    nombre_responsable: "",
  });

  const fetchPacientes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("pacientes").select("*").order("created_at", { ascending: false });
    if (!error && data) {
      setPacientes(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPacientes();
  }, []);
  const handleOpenModal = (paciente?: Paciente) => {
    if (paciente) {
      setEditingId(paciente.id);
      setFormData({
        nombre_completo: paciente.nombre_completo,
        edad: paciente.edad.toString(),
        peso_inicial: paciente.peso_inicial.toString(),
        diagnostico: paciente.diagnostico || "",
        direccion: paciente.direccion || "",
        contacto_emergencia: paciente.contacto_emergencia || "",
        nombre_responsable: paciente.nombre_responsable || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        nombre_completo: "",
        edad: "",
        peso_inicial: "",
        diagnostico: "",
        direccion: "",
        contacto_emergencia: "",
        nombre_responsable: "",
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nombre_completo: formData.nombre_completo,
      edad: parseInt(formData.edad),
      peso_inicial: parseFloat(formData.peso_inicial),
      diagnostico: formData.diagnostico,
      direccion: formData.direccion,
      contacto_emergencia: formData.contacto_emergencia,
      telefono_responsable: formData.contacto_emergencia,
      nombre_responsable: formData.nombre_responsable,
    };

    if (editingId) {
      await supabase.from("pacientes").update(payload).eq("id", editingId);
    } else {
      await supabase.from("pacientes").insert([payload]);
    }
    handleCloseModal();
    fetchPacientes();
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este paciente?")) {
      await supabase.from("pacientes").delete().eq("id", id);
      fetchPacientes();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Pacientes</h1>
          <p className="text-gray-500 mt-1">Gestión de base de datos de pacientes</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-[#2B6CB0] text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-800 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-5 h-5" />
          Agregar Paciente
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-medium">
                <th className="p-4">Nombre</th>
                <th className="p-4">Edad</th>
                <th className="p-4">Diagnóstico</th>
                <th className="p-4">Contacto</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center p-8 text-gray-500">Cargando...</td></tr>
              ) : pacientes.length === 0 ? (
                <tr><td colSpan={5} className="text-center p-8 text-gray-500">No hay pacientes registrados.</td></tr>
              ) : (
                pacientes.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-medium text-gray-800">{p.nombre_completo}</td>
                    <td className="p-4 text-gray-600">{p.edad} años</td>
                    <td className="p-4 text-gray-600">{p.diagnostico}</td>
                    <td className="p-4 text-gray-600">
                      {p.nombre_responsable ? `${p.nombre_responsable} (${p.contacto_emergencia})` : p.contacto_emergencia}
                    </td>
                    <td className="p-4 flex justify-end gap-2">
                      <button onClick={() => handleOpenModal(p)} className="p-2 text-[#2B6CB0] hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">{editingId ? "Editar Paciente" : "Nuevo Paciente"}</h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input required name="nombre_completo" value={formData.nombre_completo} onChange={handleChange} className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5] focus:border-[#4FD1C5]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Edad</label>
                  <input required type="number" name="edad" value={formData.edad} onChange={handleChange} className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso Inicial (kg)</label>
                  <input required type="number" step="0.1" name="peso_inicial" value={formData.peso_inicial} onChange={handleChange} className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diagnóstico Principal</label>
                <input required name="diagnostico" value={formData.diagnostico} onChange={handleChange} className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input required name="direccion" value={formData.direccion} onChange={handleChange} className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Contacto Emergencia</label>
                  <input required name="nombre_responsable" value={formData.nombre_responsable} onChange={handleChange} className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5] focus:border-[#4FD1C5]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono Contacto Emergencia</label>
                  <input required name="contacto_emergencia" value={formData.contacto_emergencia} onChange={handleChange} className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5] focus:border-[#4FD1C5]" />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-3 px-4 border rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-3 px-4 bg-[#2B6CB0] text-white rounded-xl font-medium hover:bg-blue-800 transition-colors">
                  {editingId ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
