import { createClient } from '@supabase/supabase-js'

// Inicialización directa para evitar errores de variables de entorno en localhost
const supabaseUrl = 'https://ljcdwvpgximnuerejffu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqY2R3dnBneGltbnVlcmVqZmZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNTU5NTEsImV4cCI6MjA5NTczMTk1MX0.mTMxrObvgYS0wGU88kemkCwXbU8ktZ6_1tciqg_6oFU'

export const supabase = createClient(supabaseUrl.trim(), supabaseAnonKey.trim())

console.log("¡Cliente de Supabase inicializado de forma directa!");
