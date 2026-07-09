"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import DashboardStats from "@/components/dashboard/dashboardstats";
import Card from "@/components/ui/card";
import AlertBox from "@/components/ui/AlertBox";
import { AppMetricRow } from "@/components/ui";
import { Siren, TriangleAlert, FileText, Users } from "lucide-react";

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Tableau de bord
        </h1>
        <p className="mt-2 text-gray-600 dark:text-slate-400">
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

    <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-lg">

    <h2 className="text-xl font-bold text-white">
        Alertes
    </h2>

    <p className="mb-6 text-sm text-slate-400">
        Points à surveiller
    </p>

    <div className="space-y-3">

        <AlertBox variant="danger">
            <span className="font-bold text-red-400">{critiques}</span>
            <span className="ml-2">consigne(s) critique(s)</span>
        </AlertBox>

        <AlertBox variant="warning">
            <span className="font-bold text-orange-400">{hautes}</span>
            <span className="ml-2">consigne(s) priorité haute</span>
        </AlertBox>

        <AlertBox variant="info">
            <span className="font-bold text-blue-400">{fichiers}</span>
            <span className="ml-2">document(s) joint(s)</span>
        </AlertBox>

        <AlertBox variant="success">
            <span className="font-bold text-emerald-400">{utilisateurs}</span>
            <span className="ml-2">utilisateur(s)</span>
        </AlertBox>

    </div>

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