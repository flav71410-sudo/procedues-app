"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  async function updatePassword() {
    if (!password || !confirm) {
      alert("Merci de remplir les deux champs.");
      return;
    }

    if (password.length < 6) {
      alert("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirm) {
      alert("Les mots de passe ne correspondent pas.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      alert("Erreur lors de la mise à jour du mot de passe.");
      return;
    }

    alert("Mot de passe modifié. Vous pouvez vous connecter.");
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-[#0078b8] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <img
          src="/logo.png"
          alt="Logo Castorama"
          className="mx-auto mb-6 w-64 rounded-xl"
        />

        <h1 className="text-2xl font-bold text-center text-gray-900">
          Nouveau mot de passe
        </h1>

        <div className="mt-8 space-y-4">
          <input
            type="password"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900"
            placeholder="Confirmer le mot de passe"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <button
            onClick={updatePassword}
            className="w-full bg-[#0078b8] hover:bg-[#00649a] text-white rounded-xl py-3 font-semibold"
          >
            Modifier le mot de passe
          </button>
        </div>
      </div>
    </main>
  );
}