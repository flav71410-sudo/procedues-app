import { supabase } from "@/lib/supabase";

export async function rechercheGlobale(terme: string) {
  const q = terme.trim().toLowerCase();

  if (!q) return [];

  const [consignes, documents, maintenance, securite, planning] =
    await Promise.all([
      supabase.from("consignes").select("id, titre").ilike("titre", `%${q}%`),
      supabase.from("documents").select("id, titre").ilike("titre", `%${q}%`),
      supabase.from("maintenance_interventions").select("id, titre").ilike("titre", `%${q}%`),
      supabase.from("securite_main_courante").select("id, titre").ilike("titre", `%${q}%`),
      supabase.from("planning_reglementaire").select("id, titre").ilike("titre", `%${q}%`),
    ]);

  return [
    ...(consignes.data || []).map((x) => ({
      type: "Consigne",
      titre: x.titre,
      lien: "/consignes",
    })),
    ...(documents.data || []).map((x) => ({
      type: "Document",
      titre: x.titre,
      lien: "/documents",
    })),
    ...(maintenance.data || []).map((x) => ({
      type: "Maintenance",
      titre: x.titre,
      lien: "/maintenance",
    })),
    ...(securite.data || []).map((x) => ({
      type: "Sécurité",
      titre: x.titre,
      lien: "/securite",
    })),
    ...(planning.data || []).map((x) => ({
      type: "Planning",
      titre: x.titre,
      lien: "/planning",
    })),
  ];
}