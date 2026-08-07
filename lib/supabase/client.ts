import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Les variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont obligatoires."
  );
}

/*
 * Une seule instance dans tout le navigateur.
 * Cela supprime l'avertissement « Multiple GoTrueClient instances detected »
 * et garantit que Header, Sidebar, Dashboard et services partagent la même session.
 */
export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
);

export function createClient() {
  return supabase;
}
