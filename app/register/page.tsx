"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  LockKeyhole,
  Store,
  UserPlus,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { ajouterJournal } from "@/services/journal";



type Magasin = {
  id: string;
  nom: string;
};

type CleActivationResult = {
  role_id: string;
  role_nom: string;
  magasin_id: string;
  magasin_nom: string;
};

function messageErreur(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return "Une erreur inconnue est survenue.";
}

function roleTechnique(roleNom: string): string {
  return roleNom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
}

export default function RegisterPage() {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [magasinId, setMagasinId] = useState("");
  const [magasins, setMagasins] = useState<Magasin[]>([]);
  const [cleActivation, setCleActivation] = useState("");

  const [loadingMagasins, setLoadingMagasins] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    void chargerMagasins();
  }, []);

  async function chargerMagasins() {
    try {
      setLoadingMagasins(true);

      const { data, error } = await supabase
        .from("magasins")
        .select("id, nom")
        .order("nom", { ascending: true });

      if (error) throw error;

      setMagasins((data ?? []) as Magasin[]);
    } catch (currentError) {
      console.error("Erreur chargement magasins :", currentError);
      setError("Impossible de charger la liste des magasins.");
    } finally {
      setLoadingMagasins(false);
    }
  }

  async function consommerCle(code: string): Promise<CleActivationResult> {
    const { data, error } = await supabase.rpc(
      "consommer_cle_activation",
      { p_code: code.trim() }
    );

    if (error) throw error;

    const resultat = Array.isArray(data) ? data[0] : data;

    if (!resultat) {
      throw new Error(
        "La clé d’activation n’a retourné aucun rôle ni magasin."
      );
    }

    return resultat as CleActivationResult;
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanPrenom = prenom.trim();
    const cleanNom = nom.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCle = cleActivation.trim();

    if (!cleanPrenom || !cleanNom || !cleanEmail || !password || !magasinId) {
      setError("Merci de remplir tous les champs obligatoires.");
      return;
    }

   

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    try {
      setLoading(true);

      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              prenom: cleanPrenom,
              nom: cleanNom,
            },
          },
        });

      if (signUpError) throw signUpError;

      const userId = signUpData.user?.id;

      if (!userId) {
        throw new Error(
          "Le compte a été créé, mais aucun identifiant utilisateur n’a été retourné."
        );
      }

      /*
       * Sans clé d'activation :
       * le nouvel inscrit reçoit le rôle technique COLLABORATEUR,
       * sans role_id. Il n'a aucun accès métier tant qu'un responsable
       * ne lui attribue pas un rôle depuis l'administration.
       *
       * Avec une clé d'activation :
       * le rôle et le magasin provenant de la clé sont appliqués.
       */
      let roleIdFinal: string | null = null;
      let roleNomFinal = "Collaborateur";
      let magasinIdFinal = magasinId;
      let magasinNomFinal =
        magasins.find((magasin) => magasin.id === magasinId)?.nom ??
        "Magasin sélectionné";

      if (cleanCle) {
        const activation = await consommerCle(cleanCle);

        roleIdFinal = activation.role_id;
        roleNomFinal = activation.role_nom;
        magasinIdFinal = activation.magasin_id;
        magasinNomFinal = activation.magasin_nom;
      }

      const { error: profilError } = await supabase
        .from("profils")
        .insert({
          id: userId,
          nom: cleanNom,
          prenom: cleanPrenom,
          email: cleanEmail,
          role: roleTechnique(roleNomFinal),
          role_id: roleIdFinal,
          secteur: null,
          secteur_id: null,
          magasin_id: magasinIdFinal,
          actif: true,
        });

      if (profilError) {
        throw new Error(
          `Compte créé, mais erreur lors de la création du profil : ${profilError.message}`
        );
      }

      await ajouterJournal(
        "Création",
        "Utilisateurs",
        cleanCle
          ? `${cleanPrenom} ${cleanNom} a créé son compte avec une clé d’activation (${roleNomFinal})`
          : `${cleanPrenom} ${cleanNom} a créé son compte Collaborateur`,
        magasinIdFinal
      );

      // Supabase peut ouvrir automatiquement une session après signUp.
// On la ferme afin que l'utilisateur revienne bien sur l'écran de connexion.
await supabase.auth.signOut();

// Retour vers la connexion avec indication d'inscription réussie.
window.location.href = "/?inscription=ok";
    } catch (currentError) {
      console.error("Erreur inscription :", currentError);
      setError(messageErreur(currentError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0078b8] p-6">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex justify-center">
          <img
            src="/secumanager-logo.png"
            alt="Logo SécuManager"
            className="w-64 rounded-xl"
          />
        </div>

        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-[#0078b8]">
            <UserPlus size={24} />
          </div>

          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Créer un compte
          </h1>

          <p className="mt-2 text-gray-600">
  Créez votre compte SécuManager
</p>
        </div>

        <form onSubmit={handleRegister} className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <ChampTexte
              label="Prénom"
              value={prenom}
              onChange={setPrenom}
              placeholder="Prénom"
              autoComplete="given-name"
            />

            <ChampTexte
              label="Nom"
              value={nom}
              onChange={setNom}
              placeholder="Nom"
              autoComplete="family-name"
            />
          </div>

          <ChampTexte
  label="Adresse email"
  type="email"
  value={email}
  onChange={setEmail}
  placeholder="votre@email.fr"
  autoComplete="email"
/>

          <ChampTexte
            label="Mot de passe"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="6 caractères minimum"
            autoComplete="new-password"
          />

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Store size={16} />
              Magasin
            </span>

            <select
              value={magasinId}
              onChange={(event) => setMagasinId(event.target.value)}
              disabled={loadingMagasins || loading}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="">
                {loadingMagasins
                  ? "Chargement des magasins..."
                  : "Sélectionner un magasin"}
              </option>

              {magasins.map((magasin) => (
                <option key={magasin.id} value={magasin.id}>
                  {magasin.nom}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-900">
                <KeyRound size={17} />
                Clé d’activation
                <span className="font-normal">(facultatif)</span>
              </span>

              <input
                type="text"
                value={cleActivation}
                onChange={(event) =>
                  setCleActivation(event.target.value.toUpperCase())
                }
                disabled={loading}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-amber-300 bg-white px-4 py-3 font-mono uppercase tracking-wide text-gray-900 outline-none transition placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            </label>

            <div className="mt-3 flex items-start gap-2 text-sm text-amber-800">
              <LockKeyhole size={17} className="mt-0.5 shrink-0" />

              <p>
                <strong>
                  Réservée aux Responsables Sécurité / Administrateurs.
                </strong>{" "}
                Laisse ce champ vide pour créer un compte Collaborateur. Cette
                clé est fournie par le Super Administrateur et n’est utilisable
                qu’une seule fois.
              </p>
            </div>

            {cleActivation.trim() && (
              <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-medium text-amber-800">
                Le rôle et le magasin définis par la clé remplaceront le magasin
                sélectionné ci-dessus.
              </p>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || loadingMagasins}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0078b8] py-3 font-semibold text-white transition hover:bg-[#00649a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={19} className="animate-spin" />
                Création...
              </>
            ) : (
              <>
                <UserPlus size={19} />
                Créer le compte
              </>
            )}
          </button>

          <a
            href="/"
            className="block text-center text-sm font-semibold text-[#0078b8] hover:underline"
          >
            Déjà un compte ? Se connecter
          </a>
        </form>
      </div>
    </main>
  );
}

function ChampTexte({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-gray-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
    </label>
  );
}