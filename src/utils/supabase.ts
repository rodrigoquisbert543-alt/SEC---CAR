import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!supabaseUrl || !supabasePublishableKey) {
  console.error('⚠️ Faltan las variables de entorno de Supabase. Revisa el archivo .env')
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)