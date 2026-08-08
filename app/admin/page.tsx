"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useDialog } from "@/providers/DialogProvider";
import { ajouterJournal } from "@/services/journal";

type RoleRow = {
  id: string;
  nom: string;
};

type MagasinRow = {
  id: string;
  nom: string;
};

type ProfilRow = {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  fonction: string | null;
  role: string | null;
  role_id: string | null;
  magasin_id: string | null;
  secteur: string | null;
  actif: boolean | null;
  created_at: string | null;
};

type FormState = {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  fonction: string;
  role_id: string;
  magasin_id: string;
  secteur: string;
  actif: boolean;
};

const SECTEURS = [
  "Direction",
  "Sécurité",
  "Maintenance",
  "Logistique",
  "Caisse",
  "Commerce",
  "Bâti",
  "Jardin",
  "Administratif",
  "Autre",
];

const EMPTY_FORM: FormState = {
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  fonction: "",
  role_id: "",
  magasin_id: "",
  secteur: "",
  actif: true,
};

function normaliser(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function roleCodeDepuisNom(nom: string | null | undefined): string {
  const valeur = normaliser(nom);

  if (valeur.includes("super administrateur")) {
    return "SUPER_ADMIN";
  }

  if (
    valeur.includes("administrateur") ||
    valeur.includes("responsable securite")
  ) {
    return "ADMIN";
  }

  if (valeur === "dm" || valeur.includes("directeur magasin")) {
    return "DM";
  }

  return "PERMANENT";
}

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}

function nomComplet(profil: ProfilRow): string {
  return (
    [profil.prenom, profil.nom].filter(Boolean).join(" ").trim() ||
    profil.email ||
    "Utilisateur"
  );
}

export default function UtilisateursPage() {
  const dialog = useDialog();

  const {
    can,
    role,
    magasin: magasinUtilisateur,
    profil: profilConnecte,
  } = useAuth();

  const canView = can("users.view");
  const canManage = can("users.manage");

  const [profils, setProfils] = useState<ProfilRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [magasins, setMagasins] = useState<MagasinRow[]>([]);

  const [recherche, setRecherche] = useState("");
  const [filtreMagasin, setFiltreMagasin] = useState("");
  const [filtreRole, setFiltreRole] = useState("");
  const [filtreEtat, setFiltreEtat] = useState("");

  const [selection, setSelection] = useState<ProfilRow | null>(null);
  const [formulaire, setFormulaire] =
    useState<FormState>(EMPTY_FORM);

  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [suppressionId, setSuppressionId] = useState<string | null>(null);

  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  const estSuperAdmin = role === "SUPER_ADMIN";

  const chargerDonnees = useCallback(
    async (silencieux = false) => {
      if (!canView) {
        setChargement(false);
        return;
      }

      try {
        if (silencieux) {
          setActualisation(true);
        } else {
          setChargement(true);
        }

        setErreur(null);

        let profilsQuery = supabase
          .from("profils")
          .select(
            `
              id,
              nom,
              prenom,
              email,
              telephone,
              fonction,
              role,
              role_id,
              magasin_id,
              secteur,
              actif,
              created_at
            `
          )
          .order("nom", { ascending: true });

        if (!estSuperAdmin && magasinUtilisateur?.id) {
          profilsQuery = profilsQuery.eq(
            "magasin_id",
            magasinUtilisateur.id
          );
        }

        const [profilsResult, rolesResult, magasinsResult] =
          await Promise.all([
            profilsQuery,
            supabase
              .from("roles")
              .select("id, nom")
              .order("nom", { ascending: true }),
            supabase
              .from("magasins")
              .select("id, nom")
              .order("nom", { ascending: true }),
          ]);

        if (profilsResult.error) {
          throw profilsResult.error;
        }

        if (rolesResult.error) {
          throw rolesResult.error;
        }

        if (magasinsResult.error) {
          throw magasinsResult.error;
        }

        const profilsCharges =
          (profilsResult.data ?? []) as ProfilRow[];
        const rolesCharges =
          (rolesResult.data ?? []) as RoleRow[];
        const magasinsCharges =
          (magasinsResult.data ?? []) as MagasinRow[];

        setProfils(profilsCharges);
        setRoles(rolesCharges);

        setMagasins(
          estSuperAdmin
            ? magasinsCharges
            : magasinsCharges.filter(
                (magasin) =>
                  magasin.id === magasinUtilisateur?.id
              )
        );

        if (selection) {
          const selectionActualisee = profilsCharges.find(
            (profil) => profil.id === selection.id
          );

          if (selectionActualisee) {
            ouvrirProfil(selectionActualisee);
          } else {
            fermerPanneau();
          }
        }
      } catch (error) {
        console.error(
          "Erreur chargement utilisateurs :",
          error
        );

        setErreur(
          error instanceof Error
            ? error.message
            : "Impossible de charger les utilisateurs."
        );
      } finally {
        setChargement(false);
        setActualisation(false);
      }
    },
    [
      canView,
      estSuperAdmin,
      magasinUtilisateur?.id,
      selection,
    ]
  );

  useEffect(() => {
    void chargerDonnees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, estSuperAdmin, magasinUtilisateur?.id]);

  useEffect(() => {
    if (!succes) return;

    const timer = window.setTimeout(() => {
      setSucces(null);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [succes]);

  const roleMap = useMemo(
    () => new Map(roles.map((item) => [item.id, item.nom])),
    [roles]
  );

  const magasinMap = useMemo(
    () =>
      new Map(
        magasins.map((item) => [item.id, item.nom])
      ),
    [magasins]
  );

  const profilsFiltres = useMemo(() => {
    const terme = normaliser(recherche);

    return profils.filter((profil) => {
      const roleNom = profil.role_id
        ? roleMap.get(profil.role_id) ?? profil.role ?? ""
        : profil.role ?? "";

      const magasinNom = profil.magasin_id
        ? magasinMap.get(profil.magasin_id) ?? ""
        : "";

      const correspondRecherche =
        !terme ||
        normaliser(
          [
            profil.nom,
            profil.prenom,
            profil.email,
            profil.telephone,
            profil.fonction,
            roleNom,
            magasinNom,
            profil.secteur,
          ].join(" ")
        ).includes(terme);

      const correspondMagasin =
        !filtreMagasin ||
        profil.magasin_id === filtreMagasin;

      const correspondRole =
        !filtreRole || profil.role_id === filtreRole;

      const correspondEtat =
        !filtreEtat ||
        (filtreEtat === "actif"
          ? profil.actif !== false
          : profil.actif === false);

      return (
        correspondRecherche &&
        correspondMagasin &&
        correspondRole &&
        correspondEtat
      );
    });
  }, [
    profils,
    recherche,
    filtreMagasin,
    filtreRole,
    filtreEtat,
    roleMap,
    magasinMap,
  ]);

  const statistiques = useMemo(() => {
    const actifs = profils.filter(
      (profil) => profil.actif !== false
    ).length;

    const inactifs = profils.length - actifs;

    const sansMagasin = profils.filter(
      (profil) => !profil.magasin_id
    ).length;

    return {
      total: profils.length,
      actifs,
      inactifs,
      sansMagasin,
    };
  }, [profils]);

  function ouvrirProfil(profil: ProfilRow) {
    setSelection(profil);

    setFormulaire({
      nom: profil.nom ?? "",
      prenom: profil.prenom ?? "",
      email: profil.email ?? "",
      telephone: profil.telephone ?? "",
      fonction: profil.fonction ?? "",
      role_id: profil.role_id ?? "",
      magasin_id: profil.magasin_id ?? "",
      secteur: profil.secteur ?? "",
      actif: profil.actif ?? true,
    });

    setErreur(null);
    setSucces(null);
  }

  function fermerPanneau() {
    setSelection(null);
    setFormulaire(EMPTY_FORM);
    setErreur(null);
  }

  function modifierChamp<K extends keyof FormState>(
    champ: K,
    valeur: FormState[K]
  ) {
    setFormulaire((actuel) => ({
      ...actuel,
      [champ]: valeur,
    }));
  }

  async function enregistrer(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!canManage || !selection) {
      setErreur(
        "Tu n’as pas l’autorisation de modifier cet utilisateur."
      );
      return;
    }

    if (!formulaire.role_id) {
      setErreur("Sélectionne un rôle.");
      return;
    }

    if (!formulaire.magasin_id) {
      setErreur("Sélectionne un magasin.");
      return;
    }

    if (
      !estSuperAdmin &&
      formulaire.magasin_id !== magasinUtilisateur?.id
    ) {
      setErreur(
        "Tu ne peux attribuer qu’un utilisateur à ton propre magasin."
      );
      return;
    }

    const roleSelectionne = roles.find(
      (item) => item.id === formulaire.role_id
    );

    if (!roleSelectionne) {
      setErreur("Le rôle sélectionné est introuvable.");
      return;
    }

    /*
     * Un administrateur de magasin ne peut pas créer ou attribuer
     * le rôle Super administrateur.
     */
    if (
      !estSuperAdmin &&
      roleCodeDepuisNom(roleSelectionne.nom) ===
        "SUPER_ADMIN"
    ) {
      setErreur(
        "Seul un Super administrateur peut attribuer ce rôle."
      );
      return;
    }

    try {
      setEnregistrement(true);
      setErreur(null);
      setSucces(null);

      const payload = {
        nom: formulaire.nom.trim() || null,
        prenom: formulaire.prenom.trim() || null,
        email: formulaire.email.trim() || null,
        telephone: formulaire.telephone.trim() || null,
        fonction: formulaire.fonction.trim() || null,
        role_id: formulaire.role_id,
        role: roleCodeDepuisNom(roleSelectionne.nom),
        magasin_id: formulaire.magasin_id,
        secteur: formulaire.secteur || null,
        actif: formulaire.actif,
      };

      const { data, error } = await supabase
        .from("profils")
        .update(payload)
        .eq("id", selection.id)
        .select(
          `
            id,
            nom,
            prenom,
            email,
            telephone,
            fonction,
            role,
            role_id,
            magasin_id,
            secteur,
            actif,
            created_at
          `
        )
        .single();

      if (error) {
        throw error;
      }

      const profilActualise = data as ProfilRow;

      setProfils((liste) =>
        liste
          .map((profil) =>
            profil.id === profilActualise.id
              ? profilActualise
              : profil
          )
          .sort((a, b) =>
            nomComplet(a).localeCompare(
              nomComplet(b),
              "fr"
            )
          )
      );

      setSelection(profilActualise);
      ouvrirProfil(profilActualise);

      await ajouterJournal(
        "Modification",
        "Utilisateurs",
        `${nomComplet(
          profilActualise
        )} : rôle ${roleSelectionne.nom}, magasin ${
          magasinMap.get(formulaire.magasin_id) ??
          formulaire.magasin_id
        }`
      );

      setSucces("Les informations ont été enregistrées.");
    } catch (error) {
      console.error(
        "Erreur modification utilisateur :",
        error
      );

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de modifier l’utilisateur."
      );
    } finally {
      setEnregistrement(false);
    }
  }


  async function supprimerUtilisateur() {
    if (!selection) return;

    if (!estSuperAdmin) {
      setErreur(
        "Seul un Super administrateur peut supprimer définitivement un utilisateur."
      );
      return;
    }

    if (selection.id === profilConnecte?.id) {
      setErreur(
        "Tu ne peux pas supprimer ton propre compte."
      );
      return;
    }

    const nomUtilisateur = nomComplet(selection);

    const confirmation = await dialog.delete({
      title: "Supprimer cet utilisateur ?",
      itemName: nomUtilisateur,
      description:
        "Le compte sera définitivement supprimé de CastoManager et de Supabase Auth. Cette action est irréversible.",
    });

    if (!confirmation) return;

    try {
      setSuppressionId(selection.id);
      setErreur(null);
      setSucces(null);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error(
          "Session utilisateur introuvable. Reconnecte-toi puis réessaie."
        );
      }

      const response = await fetch(
        `/api/admin/users/${selection.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const resultat = (await response.json()) as {
        success?: boolean;
        error?: string;
        warning?: string;
      };

      if (!response.ok || !resultat.success) {
        throw new Error(
          resultat.error ??
            "Impossible de supprimer l’utilisateur."
        );
      }

      setProfils((liste) =>
        liste.filter(
          (profil) => profil.id !== selection.id
        )
      );

      fermerPanneau();

      try {
        await ajouterJournal(
          "Suppression",
          "Utilisateurs",
          `Utilisateur supprimé définitivement : ${nomUtilisateur}`
        );
      } catch (journalError) {
        console.warn(
          "Utilisateur supprimé, mais journalisation impossible :",
          journalError
        );
      }

      setSucces(
        resultat.warning
          ? `Utilisateur supprimé. ${resultat.warning}`
          : `L’utilisateur « ${nomUtilisateur} » a été supprimé définitivement.`
      );
    } catch (error) {
      console.error(
        "Erreur suppression utilisateur :",
        error
      );

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer l’utilisateur."
      );
    } finally {
      setSuppressionId(null);
    }
  }

  if (!canView) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/40">
          <AlertTriangle className="mx-auto h-11 w-11 text-red-600" />

          <h1 className="mt-4 text-2xl font-bold text-red-900 dark:text-red-100">
            Accès refusé
          </h1>

          <p className="mt-2 text-red-700 dark:text-red-300">
            Tu n’as pas l’autorisation d’accéder à la
            gestion des utilisateurs.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1700px]">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Users className="h-7 w-7" />
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                Administration
              </p>

              <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
                Utilisateurs
              </h1>

              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Gestion des rôles, magasins, secteurs et
                accès.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void chargerDonnees(true)}
            disabled={actualisation}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-5 w-5 ${
                actualisation ? "animate-spin" : ""
              }`}
            />
            Actualiser
          </button>
        </header>

        {erreur && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{erreur}</span>
          </div>
        )}

        {succes && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
            <Check className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{succes}</span>
          </div>
        )}

        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Utilisateurs"
            value={statistiques.total}
          />
          <StatCard
            label="Actifs"
            value={statistiques.actifs}
            valueClassName="text-emerald-600"
          />
          <StatCard
            label="Inactifs"
            value={statistiques.inactifs}
            valueClassName="text-red-600"
          />
          <StatCard
            label="Sans magasin"
            value={statistiques.sansMagasin}
            valueClassName="text-amber-600"
          />
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-4 xl:grid-cols-[minmax(280px,1fr)_250px_250px_190px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={recherche}
                onChange={(event) =>
                  setRecherche(event.target.value)
                }
                placeholder="Rechercher un utilisateur..."
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <select
              value={filtreMagasin}
              onChange={(event) =>
                setFiltreMagasin(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="">Tous les magasins</option>

              {magasins.map((magasin) => (
                <option
                  key={magasin.id}
                  value={magasin.id}
                >
                  {magasin.nom}
                </option>
              ))}
            </select>

            <select
              value={filtreRole}
              onChange={(event) =>
                setFiltreRole(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="">Tous les rôles</option>

              {roles.map((roleItem) => (
                <option
                  key={roleItem.id}
                  value={roleItem.id}
                >
                  {roleItem.nom}
                </option>
              ))}
            </select>

            <select
              value={filtreEtat}
              onChange={(event) =>
                setFiltreEtat(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="">Tous les états</option>
              <option value="actif">Actifs</option>
              <option value="inactif">Inactifs</option>
            </select>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {chargement ? (
              <div className="flex min-h-[400px] items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
                <Loader2 className="h-6 w-6 animate-spin" />
                Chargement des utilisateurs...
              </div>
            ) : profilsFiltres.length === 0 ? (
              <div className="flex min-h-[400px] flex-col items-center justify-center px-6 text-center">
                <Users className="h-11 w-11 text-slate-400" />

                <h2 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
                  Aucun utilisateur trouvé
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Modifie les filtres pour afficher d’autres
                  utilisateurs.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {profilsFiltres.map((profil) => {
                  const actif = profil.actif !== false;
                  const selectionne =
                    selection?.id === profil.id;

                  return (
                    <button
                      key={profil.id}
                      type="button"
                      onClick={() => ouvrirProfil(profil)}
                      className={[
                        "flex w-full flex-col gap-4 p-5 text-left transition sm:flex-row sm:items-center sm:justify-between",
                        selectionne
                          ? "bg-blue-50 dark:bg-blue-950/30"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60",
                      ].join(" ")}
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {(
                            profil.prenom?.[0] ??
                            profil.email?.[0] ??
                            "U"
                          ).toUpperCase()}
                          {(
                            profil.nom?.[0] ?? ""
                          ).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">
                              {nomComplet(profil)}
                            </h2>

                            {profil.id ===
                              profilConnecte?.id && (
                              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                Toi
                              </span>
                            )}
                          </div>

                          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                            {profil.email ?? "Aucun email"}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {profil.role_id
                                ? roleMap.get(profil.role_id) ??
                                  profil.role ??
                                  "Rôle non défini"
                                : profil.role ??
                                  "Rôle non défini"}
                            </span>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {profil.magasin_id
                                ? magasinMap.get(
                                    profil.magasin_id
                                  ) ?? "Magasin inconnu"
                                : "Sans magasin"}
                            </span>

                            <span
                              className={[
                                "rounded-full px-2.5 py-1 font-semibold",
                                actif
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
                              ].join(" ")}
                            >
                              {actif ? "Actif" : "Inactif"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="hidden h-5 w-5 shrink-0 text-slate-400 sm:block" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:sticky xl:top-6">
            {!selection ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
                <UserCog className="h-12 w-12 text-slate-400" />

                <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
                  Sélectionne un utilisateur
                </h2>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Clique sur un utilisateur pour consulter et
                  modifier son rôle, son magasin et ses accès.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6 dark:border-slate-800">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                      Fiche utilisateur
                    </p>

                    <h2 className="mt-1 truncate text-xl font-bold text-slate-900 dark:text-white">
                      {nomComplet(selection)}
                    </h2>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Créé le{" "}
                      {formatDate(selection.created_at)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={fermerPanneau}
                    aria-label="Fermer la fiche"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form
                  onSubmit={enregistrer}
                  className="space-y-5 p-6"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      label="Prénom"
                      value={formulaire.prenom}
                      disabled={!canManage}
                      onChange={(value) =>
                        modifierChamp("prenom", value)
                      }
                    />

                    <TextField
                      label="Nom"
                      value={formulaire.nom}
                      disabled={!canManage}
                      onChange={(value) =>
                        modifierChamp("nom", value)
                      }
                    />
                  </div>

                  <TextField
                    label="Email"
                    type="email"
                    value={formulaire.email}
                    disabled={!canManage}
                    onChange={(value) =>
                      modifierChamp("email", value)
                    }
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      label="Téléphone"
                      type="tel"
                      value={formulaire.telephone}
                      disabled={!canManage}
                      onChange={(value) =>
                        modifierChamp("telephone", value)
                      }
                    />

                    <TextField
                      label="Fonction"
                      value={formulaire.fonction}
                      disabled={!canManage}
                      onChange={(value) =>
                        modifierChamp("fonction", value)
                      }
                    />
                  </div>

                  <SelectField
                    label="Rôle *"
                    value={formulaire.role_id}
                    disabled={!canManage}
                    onChange={(value) =>
                      modifierChamp("role_id", value)
                    }
                    options={roles
                      .filter((roleItem) => {
                        if (estSuperAdmin) return true;

                        return (
                          roleCodeDepuisNom(roleItem.nom) !==
                          "SUPER_ADMIN"
                        );
                      })
                      .map((roleItem) => ({
                        id: roleItem.id,
                        label: roleItem.nom,
                      }))}
                    placeholder="Sélectionner un rôle"
                  />

                  <SelectField
                    label="Magasin *"
                    value={formulaire.magasin_id}
                    disabled={!canManage}
                    onChange={(value) =>
                      modifierChamp("magasin_id", value)
                    }
                    options={magasins.map((magasin) => ({
                      id: magasin.id,
                      label: magasin.nom,
                    }))}
                    placeholder="Sélectionner un magasin"
                  />

                  <SelectField
                    label="Secteur"
                    value={formulaire.secteur}
                    disabled={!canManage}
                    onChange={(value) =>
                      modifierChamp("secteur", value)
                    }
                    options={SECTEURS.map((secteur) => ({
                      id: secteur,
                      label: secteur,
                    }))}
                    placeholder="Aucun secteur"
                  />

                  <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        Compte actif
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Un compte inactif ne doit plus accéder à
                        l’application.
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={formulaire.actif}
                      disabled={!canManage}
                      onChange={(event) =>
                        modifierChamp(
                          "actif",
                          event.target.checked
                        )
                      }
                      className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </label>

                  {canManage ? (
                    <div className="space-y-3">
                      <button
                        type="submit"
                        disabled={
                          enregistrement ||
                          suppressionId === selection.id
                        }
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {enregistrement ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-5 w-5" />
                        )}

                        Enregistrer les modifications
                      </button>

                      {estSuperAdmin &&
                        selection.id !== profilConnecte?.id && (
                          <button
                            type="button"
                            onClick={() =>
                              void supprimerUtilisateur()
                            }
                            disabled={
                              suppressionId === selection.id ||
                              enregistrement
                            }
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-5 py-3 font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/60"
                          >
                            {suppressionId === selection.id ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Trash2 className="h-5 w-5" />
                            )}

                            Supprimer définitivement l’utilisateur
                          </button>
                        )}

                      {estSuperAdmin &&
                        selection.id === profilConnecte?.id && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                            Ton propre compte ne peut pas être supprimé depuis cette page.
                          </div>
                        )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                      Tu disposes d’un accès en lecture seule.
                    </div>
                  )}
                </form>
              </>
            )}
          </aside>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  valueClassName = "text-slate-900 dark:text-white",
}: {
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p
        className={`mt-3 text-4xl font-bold ${valueClassName}`}
      >
        {value}
      </p>
    </article>
  );
}

function TextField({
  label,
  value,
  onChange,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </span>

      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-800"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  disabled,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  options: Array<{
    id: string;
    label: string;
  }>;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </span>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-800"
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}