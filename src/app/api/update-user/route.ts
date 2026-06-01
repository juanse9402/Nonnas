import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, user_id, nombre, telefono, username, password } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Falta el ID del perfil de auxiliar' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Configuración incompleta en el servidor (.env.local)' },
        { status: 500 }
      );
    }

    // Inicializar cliente seguro de Supabase con la Master Key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. Si el perfil tiene un user_id asociado válido, actualizar las credenciales en Supabase Auth
    if (user_id && user_id.trim() !== '') {
      const updateData: any = {};
      
      if (username) {
        // Aplicar el truco del correo virtual para el login
        updateData.email = username.includes('@') ? username : `${username}@app.nonnas`;
      }
      
      if (password && password.trim() !== '') {
        updateData.password = password;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user_id, updateData);
        if (authError) throw authError;
      }
    } else {
      console.log("No user_id provided or valid, skipping Supabase Auth update.");
    }

    // 2. Actualizar los datos públicos en la tabla public.profiles
    const profileUpdate: any = {};
    if (nombre) {
      profileUpdate.nombre = nombre;
      profileUpdate.nombre_completo = nombre;
    }
    if (telefono) {
      profileUpdate.telefono = telefono;
    }
    
    // Si la tabla perfiles tiene campo email lo actualizamos
    if (username) {
      profileUpdate.email = username.includes('@') ? username : `${username}@app.nonnas`;
    }

    if (Object.keys(profileUpdate).length > 0) {
      const { error: dbError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', id);
        
      if (dbError) throw dbError;
    }

    return NextResponse.json({ success: true, message: 'Usuario actualizado correctamente' });
  } catch (error: any) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
