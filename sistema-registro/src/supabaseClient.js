import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_API_URL;
const supabaseKey = import.meta.env.VITE_API_KEY;

// Verifica que la URL sea válida
try {
  new URL(supabaseUrl); // Valida la URL
} catch (error) {
  throw new Error("URL de Supabase inválida");
}

if (!supabaseKey) {
  throw new Error("Falta la clave de Supabase");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
