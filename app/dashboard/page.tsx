"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import ProtectedRoute from "../../components/ProtectedRoute";
import { supabase } from "@/lib/supabase";


type Consigne = {
  id: string;
  priorite: string;
  fichier_url: string | null;
};

export default function Dashboard() {
  const [total, setTotal] = useState(0);
  const [critiques, setCritiques] = useState(0);
  const [hautes, setHautes] = useState(0);
  const [fichiers, setFichiers] = useState(0);

  useEffect(() => {
    async function chargerStats() {
      const { data, error } = await supabase
        .from("consignes")
        .select("id, priorite, fichier_url");

      if (error) {
        console.error(error);
        return;
      }

      const consignes = (data || []) as Consigne[];

      setTotal(consignes.length);
      setCritiques(consignes.filter((c) => c.priorite === "critique").length);
      setHautes(consignes.filter((c) => c.priorite === "haute").length);
      setFichiers(consignes.filter((c) => c.fichier_url).length);
    }

    chargerStats();
  }, []);

  return (
    <ProtectedRoute>
      <AppShell>
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>

        <p className="mt-2 text-gray-600">
          Vue d’ensemble des consignes permanentes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <div className="bg-white rounded-2xl shadow p-6">
            <p className="text-sm text-gray-500">Consignes actives</p>
            <p className="text-4xl font-bold mt-3 text-gray-900">{total}</p>
          </div>

          <div className="bg-white rounded-2xl shadow p-6">
            <p className="text-sm text-gray-500">Critiques</p>
            <p className="text-4xl font-bold mt-3 text-red-600">{critiques}</p>
          </div>

          <div className="bg-white rounded-2xl shadow p-6">
            <p className="text-sm text-gray-500">Priorité haute</p>
            <p className="text-4xl font-bold mt-3 text-orange-500">{hautes}</p>
          </div>

          <div className="bg-white rounded-2xl shadow p-6">
            <p className="text-sm text-gray-500">Fichiers joints</p>
            <p className="text-4xl font-bold mt-3 text-[#0078b8]">{fichiers}</p>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}