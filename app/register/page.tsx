"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ajouterJournal } from "@/services/journal";

const allowedDomain =
  process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "@castorama.fr";

export default function RegisterPage() {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();

    if (!prenom.trim() || !nom.trim() || !cleanEmail || !password) {
      setError("Merci de remplir tous les champs.");
      return;
    }

    if (!cleanEmail.endsWith(allowedDomain)) {
      setError(`Seules les adresses ${allowedDomain} sont autorisées.`);
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;

    if (userId) {
      const { data: roleCollaborateur } = await supabase
        .from("roles")
        .select("id")
        .eq("nom", "Collaborateur")
        .single();

      const { error: profilError } = await supabase.from("profils").insert({
        id: userId,
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: cleanEmail,

        role: "COLLABORATEUR",
        role_id: roleCollaborateur?.id ?? null,

        secteur: null,
        secteur_id: null,

        actif: true,
      });

      if (profilError) {
        setError("Compte créé, mais erreur lors de la création du profil.");
        setLoading(false);
        return;
      }

      await ajouterJournal(
        "Création",
        "Utilisateurs",
        `${prenom.trim()} ${nom.trim()} a créé son compte`
      );
    }

    setLoading(false);
    setSuccess("Compte créé avec succès. Tu peux maintenant te connecter.");

    setPrenom("");
    setNom("");
    setEmail("");
    setPassword("");
  }

  return (
    <main className="min-h-screen bg-[#0078b8] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img
            src="/logo.png"
            alt="Logo Castorama"
            className="mx-auto mb-6 w-64 rounded-xl"
          />
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-900">
          Créer un compte
        </h1>

        <p className="text-center text-gray-600 mt-2">
          Accès réservé aux adresses {allowedDomain}
        </p>

        <div className="mt-8 space-y-4">
          <input
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-500"
            placeholder="Prénom"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
          />

          <input
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-500"
            placeholder="Nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />

          <input
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-500"
            placeholder="Adresse email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-500"
            placeholder="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-[#0078b8] hover:bg-[#00649a] text-white rounded-xl py-3 font-semibold disabled:opacity-60"
          >
            {loading ? "Création..." : "Créer le compte"}
          </button>

          <a
            href="/"
            className="block text-center text-sm text-[#0078b8] font-semibold hover:underline"
          >
            Déjà un compte ? Se connecter
          </a>
        </div>
      </div>
    </main>
  );
}