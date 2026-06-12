import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { paciente_id, nota } = await req.json();

    if (!paciente_id || !nota) {
      return NextResponse.json({ error: 'Faltan datos requeridos (paciente_id o nota)' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Get the profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, rol')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.rol !== 'auxiliar') {
      return NextResponse.json({ error: 'Solo los auxiliares pueden registrar evoluciones' }, { status: 403 });
    }

    // Validate that the auxiliar has this patient assigned right now
    const localNow = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const nowLocalString = `${localNow.getFullYear()}-${pad(localNow.getMonth() + 1)}-${pad(localNow.getDate())}T${pad(localNow.getHours())}:${pad(localNow.getMinutes())}:${pad(localNow.getSeconds())}`;
    
    const { data: turnos, error: turnosError } = await supabaseAdmin
      .from('turnos_cronograma')
      .select('id')
      .eq('auxiliar_id', profile.id)
      .eq('paciente_id', paciente_id)
      .lte('fecha_inicio', nowLocalString)
      .gte('fecha_fin', nowLocalString)
      .single();

    if (turnosError || !turnos) {
      return NextResponse.json({ error: 'No tienes turno activo con este paciente en este momento.' }, { status: 403 });
    }

    // Insert the historia
    const payload = {
      paciente_id,
      auxiliar_id: profile.id,
      nota
    };

    const { data: result, error: insertError } = await supabaseAdmin
      .from('historias_clinicas')
      .insert([payload])
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
