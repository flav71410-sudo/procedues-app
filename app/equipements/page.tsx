"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

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

  async function chargerDonnees() {
    const { data: typesData } = await supabase
      .from("types_equipements")
      .select("*")
      .order("nom");

    const { data: equipementsData } = await supabase
      .from("equipements")
      .select("*")
      .order("numero");

    setTypes(typesData || []);
    setEquipements(equipementsData || []);
  }

  useEffect(() => {
    chargerDonnees();
  }, []);

  function compterParType(typeId: string) {
    return equipements.filter((e) => e.type_id === typeId).length;
  }

  const aVerifier = equipements.filter((e) => {
    if (!e.prochaine_verification) return false;
    return new Date(e.prochaine_verification) <= new Date();
  }).length;

  return (
    <AppShell>
      <AppPage
        title="Équipements"
        subtitle="Gestion du patrimoine technique et sécurité du magasin."
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
              {equipements.filter((e) => e.etat === "En service").length}
            </p>
          </AppCard>
        </div>

        <AppCard
          title="Répartition par type"
          subtitle="Vue globale des familles d’équipements"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {types.map((type) => (
              <div
                key={type.id}
                className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-5"
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
              {equipements.slice(0, 10).map((equipement) => (
                <div
                  key={equipement.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-slate-800 p-4"
                >
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {equipement.numero} — {equipement.nom}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {equipement.emplacement || "Emplacement non défini"}
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