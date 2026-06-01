import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { id, user_id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Falta el ID del perfil' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) return NextResponse.json({ error: 'Falta configurar .env.local' }, { status: 500 });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    if (user_id) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (authError && authError.status !== 404) return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    const { error: dbError } = await supabaseAdmin.from('profiles').delete().eq('id', id);
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

    return NextResponse.json({ success: true, message: 'Usuario eliminado' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
