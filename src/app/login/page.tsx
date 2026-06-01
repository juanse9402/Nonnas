"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const finalEmail = username.includes('@') ? username : `${username}@app.nonnas`;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: finalEmail,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Verificar si es admin o auxiliar consultando profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', data.user.id)
        .single();

      if (profile?.rol === 'admin' || data.user.email === 'nuevo.admin@nonnas.com' || data.user.email === 'admin@nonnas.com') {
        router.push("/admin");
      } else {
        router.push("/");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7FAFC] bg-[radial-gradient(#4FD1C515_1px,transparent_1px)] [background-size:20px_20px] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-white p-8 pb-4 text-center border-b border-gray-100">
          <img src="/logo.png" alt="Logo Nonnas" className="w-20 h-20 mx-auto mb-2 object-contain" />
          <h1 className="text-3xl font-bold text-[#2B6CB0]">Nonnas</h1>
          <p className="mt-1 text-sm font-medium tracking-widest text-[#4FD1C5]">AUXILIARES DE ENFERMERÍA</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-xl focus:ring-[#4FD1C5] focus:border-[#4FD1C5] text-lg bg-gray-50"
                  placeholder="nombre_usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-xl focus:ring-[#4FD1C5] focus:border-[#4FD1C5] text-lg bg-gray-50"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-md text-lg font-bold text-white bg-[#2B6CB0] hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4FD1C5] transition-all disabled:opacity-70 mt-8 min-h-[56px] items-center"
            >
              {loading ? "Iniciando sesión..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
