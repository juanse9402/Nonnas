"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createClient } from "@supabase/supabase-js";
import { Plus, Edit2, Trash2, X, UserSquare2 } from "lucide-react";

type Auxiliar = {
  id: string;
  user_id?: string;
  nombre: string;
  telefono: string;
  rol: string;
};

export default function AuxiliaresPage() {
  const [auxiliares, setAuxiliares] = useState<Auxiliar[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    user_id: null as string | null,
    nombre: "",
    telefono: "",
    usuario: "",
    password: "",
    newPassword: "",
    rol: "auxiliar",
  });

  const fetchAuxiliares = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (!error && data) {
      setAuxiliares(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAuxiliares();
  }, []);

  const handleOpenModal = (auxiliar?: Auxiliar) => {
    if (auxiliar) {
      setEditingId(auxiliar.id);
      setFormData({
        user_id: auxiliar.user_id || null,
        nombre: auxiliar.nombre || "",
        telefono: auxiliar.telefono || "",
        usuario: "Oculto (Seguridad)",
        password: "",
        newPassword: "",
        rol: auxiliar.rol || "auxiliar",
      });
    } else {
      setEditingId(null);
      setFormData({
        user_id: null,
        nombre: "",
        telefono: "",
        usuario: "",
        password: "",
        newPassword: "",
        rol: "auxiliar",
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const registerNewUser = async (email: string, password: string, nombreCompleto: string, telefono: string, rol: string) => {
    // Instancia temporal dedicada únicamente al registro (no cierra la sesión del Admin)
    const tempSupabase = createClient(
      'https://ljcdwvpgximnuerejffu.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqY2R3dnBneGltbnVlcmVqZmZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNTU5NTEsImV4cCI6MjA5NTczMTk1MX0.mTMxrObvgYS0wGU88kemkCwXbU8ktZ6_1tciqg_6oFU',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    )

    const { data, error } = await tempSupabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre: nombreCompleto,
          nombre_completo: nombreCompleto,
          telefono: telefono,
          rol: rol
        }
      }
    });

    if (error) throw error;
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        // Modo Edición: actualiza a través de la API segura
        const payload = {
          id: editingId,
          user_id: formData.user_id,
          nombre: formData.nombre,
          telefono: formData.telefono,
          username: formData.usuario !== "Oculto (Seguridad)" ? formData.usuario : undefined,
          password: formData.newPassword || undefined
        };

        const res = await fetch("/api/update-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Error al actualizar auxiliar");
        }
      } else {
        // Modo Creación
        if (formData.password.length < 6) {
          alert("La contraseña debe tener al menos 6 caracteres.");
          return;
        }
        const finalEmail = formData.usuario.includes('@') ? formData.usuario : `${formData.usuario}@app.nonnas`;
        await registerNewUser(finalEmail, formData.password, formData.nombre, formData.telefono, formData.rol);
      }
      
      handleCloseModal();
      fetchAuxiliares();
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    }
  };

  const handleDelete = async (id: string, user_id?: string) => {
    if (confirm("¿Estás seguro de eliminar este auxiliar?")) {
      try {
        const res = await fetch("/api/delete-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, user_id })
        });
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Error al eliminar auxiliar");
        }
        
        fetchAuxiliares();
      } catch (err: any) {
        alert("Error al eliminar: " + err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-2 rounded-xl text-[#4FD1C5]">
             <UserSquare2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Auxiliares</h1>
            <p className="text-gray-500 mt-1">Gestión del personal de enfermería</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-[#2B6CB0] text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-800 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-5 h-5" />
          Agregar Usuario
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-medium">
                <th className="p-4">Nombre Completo</th>
                <th className="p-4">Teléfono</th>
                <th className="p-4">Rol</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center p-8 text-gray-500">Cargando...</td></tr>
              ) : auxiliares.length === 0 ? (
                <tr><td colSpan={4} className="text-center p-8 text-gray-500">No hay auxiliares registrados.</td></tr>
              ) : (
                auxiliares.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-medium text-gray-800 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs">
                        {a.nombre.charAt(0).toUpperCase()}
                      </div>
                      {a.nombre}
                    </td>
                    <td className="p-4 text-gray-600">{a.telefono}</td>
                    <td className="p-4">
                       <span className="bg-teal-50 text-teal-700 px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider">
                         {a.rol}
                       </span>
                    </td>
                    <td className="p-4 flex justify-end gap-2">
                      <button onClick={() => handleOpenModal(a)} className="p-2 text-[#2B6CB0] hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(a.id, a.user_id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">{editingId ? "Editar Usuario" : "Nuevo Usuario"}</h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input required name="nombre" value={formData.nombre} onChange={handleChange} className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input required name="telefono" value={formData.telefono} onChange={handleChange} className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5]" />
              </div>
              
              {!editingId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                    <input required type="text" name="usuario" value={formData.usuario} onChange={handleChange} placeholder="ej. maria_gomez" className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                    <input required type="password" name="password" minLength={6} value={formData.password} onChange={handleChange} className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5]" />
                  </div>
                </>
              )}

              {editingId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                    <input type="text" disabled value={formData.usuario} className="w-full border rounded-xl p-3 bg-gray-100 text-gray-500 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña (Opcional)</label>
                    <input type="password" name="newPassword" minLength={6} value={formData.newPassword} onChange={handleChange} placeholder="Dejar en blanco para mantener" className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5]" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol de Usuario</label>
                <select name="rol" value={formData.rol} onChange={handleChange} className="w-full border rounded-xl p-3 focus:ring-[#4FD1C5] bg-white">
                  <option value="auxiliar">Auxiliar de Enfermería</option>
                  <option value="admin">Administrador / Supervisor</option>
                </select>
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
