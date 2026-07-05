const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ljcdwvpgximnuerejffu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqY2R3dnBneGltbnVlcmVqZmZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNTU5NTEsImV4cCI6MjA5NTczMTk1MX0.mTMxrObvgYS0wGU88kemkCwXbU8ktZ6_1tciqg_6oFU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const email = 'nuevo.admin@nonnas.com';
  const password = 'Password123!';

  console.log(`Creando nuevo usuario en Supabase Auth: ${email}`);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error("Error al crear usuario Auth:", error.message);
    return;
  }

  const userId = data.user.id;
  console.log(`Usuario Auth creado con éxito. ID: ${userId}`);

  console.log("Intentando asignarle rol 'admin' en la tabla profiles...");
  
  await supabase.auth.signInWithPassword({ email, password });

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ rol: 'admin', nombre: 'Nuevo Admin' })
    .eq('user_id', userId);

  if (updateError) {
    console.error("Error al actualizar el perfil:", updateError.message);
    console.log("\n⚠️ La regla de seguridad (RLS) bloqueó la actualización de su rol.");
  } else {
    console.log("\n✅ ¡LISTO! Usuario administrador creado y rol actualizado con éxito.");
  }
  
  console.log("\nCREDENCIALES PARA INICIAR SESIÓN:");
  console.log("Correo:", email);
  console.log("Contraseña:", password);
}

main();
