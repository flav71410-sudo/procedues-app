/*
 * Pont de compatibilité.
 * Les anciennes pages peuvent continuer à importer "@/lib/supabase",
 * sans créer une seconde instance Supabase Auth.
 */
export {
  supabase,
  createClient,
} from "@/lib/supabase/client";
