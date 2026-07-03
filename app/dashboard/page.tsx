"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import DashboardStats from "@/components/dashboard/dashboardstats";
import Card from "@/components/ui/card";

type Consigne = {
  id: string;
  priorite: string;
  fichier_url: string | null;
};

type Activite = {
  id: string;
  utilisateur_nom: string | null;
  action: string;
  module: string;
  details: string | null;
  created_at: string;
};

import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const [consignes, setConsignes] = useState<Consigne[]>([]);
  const [utilisateurs, setUtilisateurs] = useState(0);


  useEffect(() => {
    async function chargerDashboard() {
      const { data: consignesData } = await supabase
        .from("consignes")
        .select("id, priorite, fichier_url");

      const { data: profilsData } = await supabase
        .from("profils")
        .select("id");

     

      setConsignes(consignesData || []);
      setUtilisateurs(profilsData?.length || 0);
    }

    chargerDashboard();
  }, []);

  const totalConsignes = consignes.length;
  const critiques = consignes.filter((c) => c.priorite === "critique").length;
  const hautes = consignes.filter((c) => c.priorite === "haute").length;
  const fichiers = consignes.filter((c) => c.fichier_url).length;

  return (
    <AppShell>
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Tableau de bord
        </h1>
        <p className="mt-2 text-gray-600">
          Vue générale de l’activité du logiciel.
        </p>
      </div>

      <DashboardStats
        totalConsignes={totalConsignes}
        critiques={critiques}
        hautes={hautes}
        fichiers={fichiers}
        utilisateurs={utilisateurs}
        activites={0}
      />

     <div className="mt-8">
    <Card
        title="Alertes"
        subtitle="Points à surveiller"
    >
        <div className="space-y-4 text-sm">

            <div className="rounded-xl bg-red-50 text-red-700 p-4">
                🚨 {critiques} consigne(s) critique(s)
            </div>

            <div className="rounded-xl bg-orange-50 text-orange-700 p-4">
                ⚠️ {hautes} consigne(s) priorité haute
            </div>

            <div className="rounded-xl bg-blue-50 text-blue-700 p-4">
                📎 {fichiers} document(s) joint(s)
            </div>

            <div className="rounded-xl bg-green-50 text-green-700 p-4">
                👥 {utilisateurs} utilisateur(s)
            </div>

        </div>
    </Card>
</div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
        <Card title="Prochains modules" subtitle="Développement prévu">
          <ul className="space-y-3 text-gray-700">
            <li>📄 Documents</li>
            <li>🛠 Maintenance</li>
            <li>🛡 Sécurité</li>
            <li>📅 Planning réglementaire</li>
          </ul>
        </Card>

        <Card title="État du logiciel" subtitle="Version actuelle">
          <div className="space-y-3 text-gray-700">
            <p>✅ Authentification opérationnelle</p>
            <p>✅ Consignes opérationnelles</p>
            <p>✅ Journal d’activité opérationnel</p>
            <p>✅ Administration en cours</p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}