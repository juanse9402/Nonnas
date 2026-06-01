"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, UserSquare2, Calendar, LogOut, Menu, ClipboardList, Clock } from "lucide-react";
import Logo from "@/components/Logo";
import { useState } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Pacientes", href: "/admin/pacientes", icon: Users },
    { name: "Auxiliares", href: "/admin/auxiliares", icon: UserSquare2 },
    { name: "Cronograma", href: "/admin/cronograma", icon: Calendar },
    { name: "Historias Clínicas", href: "/admin/historias", icon: ClipboardList },
    { name: "Reporte de Horas", href: "/admin/horas", icon: Clock },
  ];

  const handleLogout = () => {
    // Aquí iría el cierre de sesión real con Supabase
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex flex-col md:flex-row">
      {/* Sidebar Mobile Toggle */}
      <header className="bg-[#2B6CB0] text-white p-4 flex justify-between items-center md:hidden sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Logo className="w-8 h-8 text-white" />
          <span className="font-bold text-xl tracking-tight">Nonnas Admin</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu className="w-7 h-7" />
        </button>
      </header>

      {/* Sidebar Desktop & Mobile */}
      <aside className={`
        ${sidebarOpen ? "block" : "hidden"} 
        md:block w-full md:w-64 bg-white border-r border-gray-200 h-auto md:h-screen md:sticky top-0 z-40
      `}>
        <div className="hidden md:flex p-6 items-center gap-2 border-b border-gray-100">
          <Logo className="w-8 h-8" />
          <span className="font-bold text-xl tracking-tight text-[#2B6CB0]">Nonnas</span>
        </div>
        
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors min-h-[48px] ${
                  isActive 
                    ? "bg-[#4FD1C5] text-white font-medium" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-[#2B6CB0]"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto md:absolute bottom-0 w-full">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors w-full min-h-[48px]"
          >
            <LogOut className="w-5 h-5" />
            Salir
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
