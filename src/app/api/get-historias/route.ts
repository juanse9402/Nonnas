import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
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
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const role = profile.rol;
    const url = new URL(req.url);
    const pacienteId = url.searchParams.get('paciente_id');

    if (role === 'admin') {
      // Admin sees all or filtered by patient
      let query = supabaseAdmin
        .from('historias_clinicas')
        .select('*, pacientes(*), profiles(*)')
        .order('created_at', { ascending: false });
        
      if (pacienteId) {
        query = query.eq('paciente_id', pacienteId);
      }
      
      const { data: historias, error: histError } = await query;
        
      if (histError) throw histError;
      return NextResponse.json({ success: true, data: historias || [] });
    } else if (role === 'auxiliar') {
      // Auxiliar sees only patients assigned right now
      const now = new Date().toISOString();
      const { data: turnos, error: turnosError } = await supabaseAdmin
        .from('turnos_cronograma')
        .select('paciente_id')
        .eq('auxiliar_id', profile.id)
        .lte('fecha_inicio', now)
        .gte('fecha_fin', now);
        
      if (turnosError) throw turnosError;

      const patientIds = turnos.map(t => t.paciente_id);

      if (patientIds.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }

      const { data: historias, error: histError } = await supabaseAdmin
        .from('historias_clinicas')
        .select('*, pacientes(*), profiles(*)')
        .in('paciente_id', patientIds)
        .order('created_at', { ascending: false });

      if (histError) throw histError;
      return NextResponse.json({ success: true, data: historias || [] });
    } else {
      return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
    }
    
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
