"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

import {
  AppCard,
  AppPage,
  AppBadge,
  AppEmptyState,
} from "@/components/ui";

type TypeEquipement = {
  id: string;
  nom: string;
  icone: string | null;
};

type Equipement = {
  id: string;
  numero: string;
  nom: string;
  emplacement: string | null;
  etat: string;
  prochaine_verification: string | null;
  type_id: string | null;
};

export default function EquipementsPage() {
  const [types, setTypes] = useState<TypeEquipement[]>([]);
  const [equipements, setEquipements] = useState<Equipement[]>([]);
  const [role, setRole] = useState<string>("PERMANENT");

  async function chargerDonnees() {
    console.log("chargerDonnees appelée");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(
        "Erreur lors de la récupération de l'utilisateur :",
        userError
      );
    }

    if (user) {
      const { data: profil, error: profilError } = await supabase
        .from("profils")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profilError) {
        console.error(
          "Erreur lors de la récupération du profil :",
          profilError
        );
      }

      if (profil?.role) {
        console.log("Profil :", profil);
        console.log("Rôle :", profil.role);

        setRole(profil.role);
      }
    }

    const { data: typesData, error: typesError } = await supabase
      .from("types_equipements")
      .select("*")
      .order("nom");

    if (typesError) {
      console.error(
        "Erreur lors du chargement des types d'équipements :",
        typesError
      );
    }

    const {
      data: equipementsData,
      error: equipementsError,
    } = await supabase
      .from("equipements")
      .select("*")
      .order("numero");

    if (equipementsError) {
      console.error(
        "Erreur lors du chargement des équipements :",
        equipementsError
      );
    }

    setTypes(typesData || []);
    setEquipements(equipementsData || []);
  }

  useEffect(() => {
    chargerDonnees();
  }, []);

  useEffect(() => {
    console.log("Rôle connecté :", role);
  }, [role]);

  function compterParType(typeId: string) {
    return equipements.filter(
      (equipement) => equipement.type_id === typeId
    ).length;
  }

  const aVerifier = equipements.filter((equipement) => {
    if (!equipement.prochaine_verification) {
      return false;
    }

    const { role } = useAuth();

const canEdit = role === "ADMIN" || role === "DM";

    return (
      new Date(equipement.prochaine_verification) <= new Date()
    );
  }).length;

  return (
    <AppShell>
      <AppPage
        title="Équipements TEST RÔLES"
        subtitle="Gestion du patrimoine technique et sécurité du magasin."
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <AppCard>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Équipements
            </p>

            <p className="mt-3 text-4xl font-bold text-gray-900 dark:text-white">
              {equipements.length}
            </p>
          </AppCard>

          <AppCard>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Types
            </p>

            <p className="mt-3 text-4xl font-bold text-[#0078B8]">
              {types.length}
            </p>
          </AppCard>

          <AppCard>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              À vérifier
            </p>

            <p className="mt-3 text-4xl font-bold text-orange-500">
              {aVerifier}
            </p>
          </AppCard>

          <AppCard>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              En service
            </p>

            <p className="mt-3 text-4xl font-bold text-emerald-500">
              {
                equipements.filter(
                  (equipement) =>
                    equipement.etat === "En service"
                ).length
              }
            </p>
          </AppCard>
        </div>

        <AppCard
          title="Répartition par type"
          subtitle="Vue globale des familles d’équipements"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {types.map((type) => (
              <div
                key={type.id}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {type.nom}
                    </p>

                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {compterParType(type.id)} équipement(s)
                    </p>
                  </div>

                  <AppBadge variant="info">
                    {compterParType(type.id)}
                  </AppBadge>
                </div>
              </div>
            ))}

            {types.length === 0 && (
              <AppEmptyState
                title="Aucun type d’équipement"
                description="Ajoute d’abord des types dans Supabase."
              />
            )}
          </div>
        </AppCard>

        <AppCard
          title="Derniers équipements"
          subtitle="Les équipements enregistrés dans CastoManager"
        >
          {equipements.length === 0 ? (
            <AppEmptyState
              icon="🏗️"
              title="Aucun équipement"
              description="Le module est prêt. On va maintenant ajouter le formulaire de création."
            />
          ) : (
            <div className="space-y-3">
              {equipements
                .slice(0, 10)
                .map((equipement) => (
                  <div
                    key={equipement.id}
                    className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-slate-800"
                  >
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {equipement.numero} — {equipement.nom}
                      </p>

                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {equipement.emplacement ||
                          "Emplacement non défini"}
                      </p>
                    </div>

                    <AppBadge
                      variant={
                        equipement.etat === "En service"
                          ? "success"
                          : "warning"
                      }
                    >
                      {equipement.etat}
                    </AppBadge>
                  </div>
                ))}
            </div>
          )}
        </AppCard>
      </AppPage>
    </AppShell>
  );
}