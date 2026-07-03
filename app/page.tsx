"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("Email ou mot de passe incorrect.");
      return;
    }

    window.location.href = "/dashboard";
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
          Consignes Permanentes
        </h1>

        <p className="text-center text-gray-600 mt-2">
          Castorama Claye-Souilly
        </p>

        <div className="mt-8 space-y-4">
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

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-[#0078b8] hover:bg-[#00649a] text-white rounded-xl py-3 font-semibold disabled:opacity-60"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          <a
            href="/register"
            className="block text-center text-sm text-[#0078b8] font-semibold hover:underline"
          >
            Créer un compte
          </a>
        </div>
      </div>
    </main>
  );
}