"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/services/auth";
import { ajouterJournal } from "@/services/journal";

type Profil = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  fonction: string | null;
  secteur: string | null;
  role: string;
};

export default function ProfilPage() {
  const [loading, setLoading] = useState(true);
  const [profil, setProfil] = useState<Profil | null>(null);

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [fonction, setFonction] = useState("");

  async function chargerProfil() {
    const user = await getCurrentUser();

    if (!user) {
      window.location.href = "/";
      return;
    }

    const { data, error } = await supabase
      .from("profils")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      alert("Impossible de charger votre profil.");
      return;
    }

    setProfil(data);

    setNom(data.nom || "");
    setPrenom(data.prenom || "");
    setTelephone(data.telephone || "");
    setFonction(data.fonction || "");

    setLoading(false);
  }

  async function enregistrer() {
    if (!profil) return;

    const { error } = await supabase
      .from("profils")
      .update({
        nom,
        prenom,
        telephone,
        fonction,
      })
      .eq("id", profil.id);

    if (error) {
      alert("Erreur lors de l'enregistrement.");
      return;
    }

    await ajouterJournal(
      "Modification",
      "Profil",
      "Modification de son profil utilisateur"
    );

    alert("Profil mis à jour.");

    chargerProfil();
  }

  useEffect(() => {
    chargerProfil();
  }, []);

  if (loading) {
    return (
      <AppShell>
        <p>Chargement...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="text-3xl font-bold text-gray-900">
        Mon profil
      </h1>

      <p className="mt-2 text-gray-600">
        Gérez vos informations personnelles.
      </p>

      <div className="mt-8 bg-white rounded-2xl shadow p-8 max-w-3xl">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div>
            <label className="text-sm font-semibold text-gray-700">
              Nom
            </label>

            <input
              className="mt-2 w-full border rounded-xl p-3"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              Prénom
            </label>

            <input
              className="mt-2 w-full border rounded-xl p-3"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              Téléphone
            </label>

            <input
              className="mt-2 w-full border rounded-xl p-3"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              Fonction
            </label>

            <input
              className="mt-2 w-full border rounded-xl p-3"
              value={fonction}
              onChange={(e) => setFonction(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              Email
            </label>

            <input
              disabled
              className="mt-2 w-full border rounded-xl p-3 bg-gray-100"
              value={profil?.email || ""}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              Rôle
            </label>

            <input
              disabled
              className="mt-2 w-full border rounded-xl p-3 bg-gray-100"
              value={profil?.role || ""}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              Secteur
            </label>

            <input
              disabled
              className="mt-2 w-full border rounded-xl p-3 bg-gray-100"
              value={profil?.secteur || ""}
            />
          </div>

        </div>

        <button
          onClick={enregistrer}
          className="mt-8 bg-[#0078b8] hover:bg-[#00649a] text-white px-6 py-3 rounded-xl font-semibold"
        >
          Enregistrer les modifications
        </button>

      </div>
    </AppShell>
  );
}