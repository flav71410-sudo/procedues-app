"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { ajouterJournal } from "@/services/journal";

type Statut = "planifie" | "en_cours" | "termine" | "annule";
type Priorite = "basse" | "normale" | "haute" | "critique";
type Unite = "jour" | "semaine" | "mois" | "annee";
type Vue = "jour" | "semaine" | "mois" | "liste";
type FrequencePreset =
  | "quotidien"
  | "hebdomadaire"
  | "quinzaine"
  | "mensuel"
  | "bimestriel"
  | "trimestriel"
  | "quadrimestriel"
  | "semestriel"
  | "annuel"
  | "biennal"
  | "triennal"
  | "quinquennal"
  | "personnalise";

type Evenement = {
  id: string;
  titre: string;
  description: string | null;
  categorie: string;
  date_evenement: string;
  heure_debut: string | null;
  heure_fin: string | null;
  statut: Statut;
  priorite: Priorite;
  recurrent: boolean;
  periodicite_valeur: number | null;
  periodicite_unite: Unite | null;
  equipement_id: string | null;
  prestataire_id: string | null;
  actif: boolean;
};

type Equipement = {
  id: string;
  nom: string;
  numero?: string | null;
};

type Prestataire = {
  id: string;
  nom: string;
};

type Formulaire = {
  titre: string;
  description: string;
  categorie: string;
  date_evenement: string;
  heure_debut: string;
  heure_fin: string;
  statut: Statut;
  priorite: Priorite;
  equipement_id: string;
  prestataire_id: string;
  recurrent: boolean;
  periodicite_valeur: number;
  periodicite_unite: Unite;
};

const CATEGORIES = [
  "SSI",
  "BAES",
  "Extincteurs",
  "RIA",
  "Sprinkler",
  "Désenfumage",
  "Portes coupe-feu",
  "Portes automatiques",
  "Électricité",
  "Ascenseur",
  "CTS",
  "ICPE",
  "Formation",
  "Commission sécurité",
  "Maintenance",
  "Autre",
];

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const HEURES = Array.from({ length: 15 }, (_, index) => index + 6);

const FREQUENCES: Array<{
  value: FrequencePreset;
  label: string;
  periodiciteValeur?: number;
  periodiciteUnite?: Unite;
}> = [
  {
    value: "quotidien",
    label: "Quotidien",
    periodiciteValeur: 1,
    periodiciteUnite: "jour",
  },
  {
    value: "hebdomadaire",
    label: "Hebdomadaire",
    periodiciteValeur: 1,
    periodiciteUnite: "semaine",
  },
  {
    value: "quinzaine",
    label: "Toutes les 2 semaines",
    periodiciteValeur: 2,
    periodiciteUnite: "semaine",
  },
  {
    value: "mensuel",
    label: "Mensuel",
    periodiciteValeur: 1,
    periodiciteUnite: "mois",
  },
  {
    value: "bimestriel",
    label: "Bimestriel — tous les 2 mois",
    periodiciteValeur: 2,
    periodiciteUnite: "mois",
  },
  {
    value: "trimestriel",
    label: "Trimestriel — tous les 3 mois",
    periodiciteValeur: 3,
    periodiciteUnite: "mois",
  },
  {
    value: "quadrimestriel",
    label: "Quadrimestriel — tous les 4 mois",
    periodiciteValeur: 4,
    periodiciteUnite: "mois",
  },
  {
    value: "semestriel",
    label: "Semestriel — tous les 6 mois",
    periodiciteValeur: 6,
    periodiciteUnite: "mois",
  },
  {
    value: "annuel",
    label: "Annuel",
    periodiciteValeur: 1,
    periodiciteUnite: "annee",
  },
  {
    value: "biennal",
    label: "Tous les 2 ans",
    periodiciteValeur: 2,
    periodiciteUnite: "annee",
  },
  {
    value: "triennal",
    label: "Tous les 3 ans",
    periodiciteValeur: 3,
    periodiciteUnite: "annee",
  },
  {
    value: "quinquennal",
    label: "Tous les 5 ans",
    periodiciteValeur: 5,
    periodiciteUnite: "annee",
  },
  {
    value: "personnalise",
    label: "Personnalisé",
  },
];

const FORMULAIRE_VIDE: Formulaire = {
  titre: "",
  description: "",
  categorie: "SSI",
  date_evenement: "",
  heure_debut: "",
  heure_fin: "",
  statut: "planifie",
  priorite: "normale",
  equipement_id: "",
  prestataire_id: "",
  recurrent: false,
  periodicite_valeur: 1,
  periodicite_unite: "annee",
};

function isoLocal(date: Date) {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${annee}-${mois}-${jour}`;
}

function dateDepuisIso(value: string) {
  return new Date(`${value}T12:00:00`);
}

function formatDate(value: string) {
  return dateDepuisIso(value).toLocaleDateString("fr-FR");
}

function formatHeure(value: string | null) {
  return value ? value.slice(0, 5) : "—";
}

function lundiDeLaSemaine(date: Date) {
  const resultat = new Date(date);
  const jour = resultat.getDay();
  const decalage = jour === 0 ? -6 : 1 - jour;
  resultat.setDate(resultat.getDate() + decalage);
  resultat.setHours(12, 0, 0, 0);
  return resultat;
}

function joursSemaine(date: Date) {
  const lundi = lundiDeLaSemaine(date);
  return Array.from({ length: 7 }, (_, index) => {
    const jour = new Date(lundi);
    jour.setDate(lundi.getDate() + index);
    return jour;
  });
}

function premierJourGrilleMois(date: Date) {
  const premier = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  return lundiDeLaSemaine(premier);
}

function couleurCategorie(categorie: string) {
  switch (categorie) {
    case "SSI":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-200 dark:border-red-900";
    case "Extincteurs":
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-200 dark:border-orange-900";
    case "BAES":
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/60 dark:text-yellow-200 dark:border-yellow-900";
    case "Sprinkler":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-900";
    case "Désenfumage":
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/60 dark:text-green-200 dark:border-green-900";
    case "Formation":
      return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-900";
    case "Maintenance":
      return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";
    default:
      return "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-200 dark:border-cyan-900";
  }
}

function couleurPriorite(priorite: Priorite) {
  switch (priorite) {
    case "critique":
      return "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300";
    case "haute":
      return "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300";
    case "basse":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    default:
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300";
  }
}

function libelleStatut(statut: Statut) {
  return {
    planifie: "Planifié",
    en_cours: "En cours",
    termine: "Terminé",
    annule: "Annulé",
  }[statut];
}

function frequenceDepuisPeriodicite(
  valeur: number,
  unite: Unite
): FrequencePreset {
  const correspondance = FREQUENCES.find(
    (frequence) =>
      frequence.periodiciteValeur === valeur &&
      frequence.periodiciteUnite === unite
  );

  return correspondance?.value ?? "personnalise";
}

function appliquerFrequence(
  ancien: Formulaire,
  frequence: FrequencePreset
): Formulaire {
  const configuration = FREQUENCES.find(
    (item) => item.value === frequence
  );

  if (frequence === "personnalise") {
    return {
      ...ancien,
      periodicite_valeur: 18,
      periodicite_unite: "mois",
    };
  }

  if (
    !configuration?.periodiciteValeur ||
    !configuration.periodiciteUnite
  ) {
    return ancien;
  }

  return {
    ...ancien,
    periodicite_valeur: configuration.periodiciteValeur,
    periodicite_unite: configuration.periodiciteUnite,
  };
}

function ajouterPeriodicite(
  dateIso: string,
  valeur: number,
  unite: Unite
) {
  const date = dateDepuisIso(dateIso);

  if (unite === "jour") {
    date.setDate(date.getDate() + valeur);
  }

  if (unite === "semaine") {
    date.setDate(date.getDate() + valeur * 7);
  }

  if (unite === "mois") {
    date.setMonth(date.getMonth() + valeur);
  }

  if (unite === "annee") {
    date.setFullYear(date.getFullYear() + valeur);
  }

  return isoLocal(date);
}

function recurrenceTexte(evenement: Evenement) {
  if (
    !evenement.recurrent ||
    !evenement.periodicite_valeur ||
    !evenement.periodicite_unite
  ) {
    return "Ponctuel";
  }

  const unite = {
    jour: "jour",
    semaine: "semaine",
    mois: "mois",
    annee: "année",
  }[evenement.periodicite_unite];

  return `Tous les ${evenement.periodicite_valeur} ${unite}${
    evenement.periodicite_valeur > 1 && evenement.periodicite_unite !== "mois"
      ? "s"
      : ""
  }`;
}

export default function PlanningPage() {
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [equipements, setEquipements] = useState<Equipement[]>([]);
  const [prestataires, setPrestataires] = useState<Prestataire[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vue, setVue] = useState<Vue>("mois");
  const [dateReference, setDateReference] = useState(new Date());
  const [recherche, setRecherche] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("toutes");
  const [filtreStatut, setFiltreStatut] = useState("tous");

  const [modalOuverte, setModalOuverte] = useState(false);
  const [evenementSelectionne, setEvenementSelectionne] =
    useState<Evenement | null>(null);
  const [formulaire, setFormulaire] =
    useState<Formulaire>(FORMULAIRE_VIDE);

  async function chargerDonnees() {
    setLoading(true);

    const [planning, equipementsResult, prestatairesResult] = await Promise.all([
      supabase
        .from("planning_evenements")
        .select("*")
        .eq("actif", true)
        .order("date_evenement", { ascending: true })
        .order("heure_debut", { ascending: true }),
      supabase.from("equipements").select("id, nom, numero").order("nom"),
      supabase.from("prestataires").select("id, nom").order("nom"),
    ]);

    if (planning.error) {
      alert(`Erreur planning : ${planning.error.message}`);
    } else {
      setEvenements((planning.data || []) as Evenement[]);
    }

    setEquipements(
      equipementsResult.error
        ? []
        : ((equipementsResult.data || []) as Equipement[])
    );

    setPrestataires(
      prestatairesResult.error
        ? []
        : ((prestatairesResult.data || []) as Prestataire[])
    );

    setLoading(false);
  }

  useEffect(() => {
    chargerDonnees();
  }, []);

  function ouvrirCreation(date?: string, heure?: string) {
    setEvenementSelectionne(null);
    setFormulaire({
      ...FORMULAIRE_VIDE,
      date_evenement: date || isoLocal(new Date()),
      heure_debut: heure || "",
    });
    setModalOuverte(true);
  }

  function ouvrirModification(evenement: Evenement) {
    setEvenementSelectionne(evenement);
    setFormulaire({
      titre: evenement.titre,
      description: evenement.description || "",
      categorie: evenement.categorie,
      date_evenement: evenement.date_evenement,
      heure_debut: evenement.heure_debut?.slice(0, 5) || "",
      heure_fin: evenement.heure_fin?.slice(0, 5) || "",
      statut: evenement.statut,
      priorite: evenement.priorite,
      equipement_id: evenement.equipement_id || "",
      prestataire_id: evenement.prestataire_id || "",
      recurrent: evenement.recurrent,
      periodicite_valeur: evenement.periodicite_valeur || 1,
      periodicite_unite: evenement.periodicite_unite || "annee",
    });
    setModalOuverte(true);
  }

  function fermerModal() {
    if (saving) return;
    setModalOuverte(false);
    setEvenementSelectionne(null);
    setFormulaire(FORMULAIRE_VIDE);
  }

  async function enregistrerEvenement() {
    if (!formulaire.titre.trim() || !formulaire.date_evenement) {
      alert("Le titre et la date sont obligatoires.");
      return;
    }

    if (
      formulaire.heure_debut &&
      formulaire.heure_fin &&
      formulaire.heure_fin <= formulaire.heure_debut
    ) {
      alert("L'heure de fin doit être après l'heure de début.");
      return;
    }

    setSaving(true);

    const payload = {
      titre: formulaire.titre.trim(),
      description: formulaire.description.trim() || null,
      categorie: formulaire.categorie,
      date_evenement: formulaire.date_evenement,
      heure_debut: formulaire.heure_debut || null,
      heure_fin: formulaire.heure_fin || null,
      statut: formulaire.statut,
      priorite: formulaire.priorite,
      equipement_id: formulaire.equipement_id || null,
      prestataire_id: formulaire.prestataire_id || null,
      recurrent: formulaire.recurrent,
      periodicite_valeur: formulaire.recurrent
        ? formulaire.periodicite_valeur
        : null,
      periodicite_unite: formulaire.recurrent
        ? formulaire.periodicite_unite
        : null,
      actif: true,
    };

    const requete = evenementSelectionne
      ? supabase
          .from("planning_evenements")
          .update(payload)
          .eq("id", evenementSelectionne.id)
      : supabase.from("planning_evenements").insert(payload);

    const { error } = await requete;

    if (error) {
      setSaving(false);
      alert(`Erreur enregistrement : ${error.message}`);
      return;
    }

    await ajouterJournal(
      evenementSelectionne ? "Modification" : "Création",
      "Planning",
      `${evenementSelectionne ? "Événement modifié" : "Événement créé"} : ${
        formulaire.titre
      }`
    );

    setSaving(false);
    fermerModal();
    await chargerDonnees();
  }

  async function modifierStatut(evenement: Evenement, statut: Statut) {
    const { error } = await supabase
      .from("planning_evenements")
      .update({ statut })
      .eq("id", evenement.id);

    if (error) {
      alert(`Erreur statut : ${error.message}`);
      return;
    }

    await ajouterJournal(
      "Modification",
      "Planning",
      `${evenement.titre} : ${libelleStatut(statut)}`
    );

    await chargerDonnees();
  }

  async function supprimerEvenement(evenement: Evenement) {
    if (!confirm(`Supprimer "${evenement.titre}" ?`)) return;

    const { error } = await supabase
      .from("planning_evenements")
      .update({ actif: false })
      .eq("id", evenement.id);

    if (error) {
      alert(`Erreur suppression : ${error.message}`);
      return;
    }

    await ajouterJournal(
      "Suppression",
      "Planning",
      `Événement supprimé : ${evenement.titre}`
    );

    fermerModal();
    await chargerDonnees();
  }

  async function deplacerEvenement(id: string, nouvelleDate: string) {
    const evenement = evenements.find((item) => item.id === id);
    if (!evenement || evenement.date_evenement === nouvelleDate) return;

    const ancienneDate = evenement.date_evenement;

    setEvenements((liste) =>
      liste.map((item) =>
        item.id === id ? { ...item, date_evenement: nouvelleDate } : item
      )
    );

    const { error } = await supabase
      .from("planning_evenements")
      .update({ date_evenement: nouvelleDate })
      .eq("id", id);

    if (error) {
      setEvenements((liste) =>
        liste.map((item) =>
          item.id === id ? { ...item, date_evenement: ancienneDate } : item
        )
      );
      alert(`Erreur déplacement : ${error.message}`);
      return;
    }

    await ajouterJournal(
      "Modification",
      "Planning",
      `${evenement.titre} déplacé au ${formatDate(nouvelleDate)}`
    );
  }

  const aujourdHui = isoLocal(new Date());
  const semaineActuelle = joursSemaine(new Date());
  const debutSemaine = isoLocal(semaineActuelle[0]);
  const finSemaine = isoLocal(semaineActuelle[6]);

  const statistiques = useMemo(() => {
    const actifs = evenements.filter((e) => e.statut !== "annule");

    return {
      aujourdHui: actifs.filter((e) => e.date_evenement === aujourdHui).length,
      semaine: actifs.filter(
        (e) =>
          e.date_evenement >= debutSemaine &&
          e.date_evenement <= finSemaine
      ).length,
      retard: actifs.filter(
        (e) => e.date_evenement < aujourdHui && e.statut !== "termine"
      ).length,
      termines: actifs.filter((e) => e.statut === "termine").length,
      recurrents: actifs.filter((e) => e.recurrent).length,
    };
  }, [evenements, aujourdHui, debutSemaine, finSemaine]);

  const evenementsFiltres = useMemo(() => {
    const texteRecherche = recherche.trim().toLowerCase();

    return evenements.filter((evenement) => {
      const equipement = equipements.find(
        (item) => item.id === evenement.equipement_id
      );
      const prestataire = prestataires.find(
        (item) => item.id === evenement.prestataire_id
      );

      const texte = [
        evenement.titre,
        evenement.description || "",
        evenement.categorie,
        evenement.statut,
        equipement?.nom || "",
        equipement?.numero || "",
        prestataire?.nom || "",
      ]
        .join(" ")
        .toLowerCase();

      const categorieValide =
        filtreCategorie === "toutes" ||
        evenement.categorie === filtreCategorie;

      const statutValide =
        filtreStatut === "tous" || evenement.statut === filtreStatut;

      return (
        categorieValide &&
        statutValide &&
        texte.includes(texteRecherche)
      );
    });
  }, [
    evenements,
    equipements,
    prestataires,
    recherche,
    filtreCategorie,
    filtreStatut,
  ]);

  const joursVueSemaine = useMemo(
    () => joursSemaine(dateReference),
    [dateReference]
  );

  const joursVueMois = useMemo(() => {
    const debut = premierJourGrilleMois(dateReference);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(debut);
      date.setDate(debut.getDate() + index);
      return date;
    });
  }, [dateReference]);

  function changerPeriode(direction: -1 | 1) {
    const nouvelleDate = new Date(dateReference);

    if (vue === "jour") {
      nouvelleDate.setDate(nouvelleDate.getDate() + direction);
    } else if (vue === "semaine") {
      nouvelleDate.setDate(nouvelleDate.getDate() + direction * 7);
    } else {
      nouvelleDate.setMonth(nouvelleDate.getMonth() + direction);
    }

    setDateReference(nouvelleDate);
  }

  function titrePeriode() {
    if (vue === "jour") {
      return dateReference.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }

    if (vue === "semaine") {
      return `Du ${joursVueSemaine[0].toLocaleDateString("fr-FR")} au ${joursVueSemaine[6].toLocaleDateString("fr-FR")}`;
    }

    return dateReference.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  }

  function nomEquipement(id: string | null) {
    if (!id) return "—";
    const equipement = equipements.find((item) => item.id === id);
    if (!equipement) return "Équipement inconnu";
    return equipement.numero
      ? `${equipement.nom} · ${equipement.numero}`
      : equipement.nom;
  }

  function nomPrestataire(id: string | null) {
    if (!id) return "—";
    return (
      prestataires.find((item) => item.id === id)?.nom ||
      "Prestataire inconnu"
    );
  }

  function carteEvenement(evenement: Evenement, compacte = false) {
    const retard =
      evenement.date_evenement < aujourdHui &&
      evenement.statut !== "termine" &&
      evenement.statut !== "annule";

    return (
      <button
        key={evenement.id}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", evenement.id);
          event.dataTransfer.effectAllowed = "move";
        }}
        onClick={(event) => {
          event.stopPropagation();
          ouvrirModification(evenement);
        }}
        className={`w-full rounded-lg border text-left transition hover:brightness-95 ${couleurCategorie(
          evenement.categorie
        )} ${compacte ? "px-2 py-1" : "p-3"} ${
          evenement.statut === "termine" ? "opacity-60" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-xs font-bold">
            {formatHeure(evenement.heure_debut)} · {evenement.titre}
          </p>
          {retard && (
            <span className="shrink-0 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              RETARD
            </span>
          )}
        </div>

        {!compacte && (
          <p className="mt-1 truncate text-xs opacity-80">
            {evenement.categorie} · {libelleStatut(evenement.statut)}
          </p>
        )}
      </button>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Planning
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Calendrier central des contrôles, vérifications et interventions.
            </p>
          </div>

          <button
            onClick={() => ouvrirCreation()}
            className="rounded-xl bg-[#0078b8] px-5 py-3 font-semibold text-white hover:bg-[#00649a]"
          >
            + Nouvel événement
          </button>
        </header>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[
            ["Aujourd'hui", statistiques.aujourdHui],
            ["Cette semaine", statistiques.semaine],
            ["En retard", statistiques.retard],
            ["Terminés", statistiques.termines],
            ["Récurrents", statistiques.recurrents],
          ].map(([libelle, valeur]) => (
            <article
              key={String(libelle)}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {libelle}
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {valeur}
              </p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_210px_180px_auto]">
            <input
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder="Rechercher un événement, équipement, prestataire..."
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            />

            <select
              value={filtreCategorie}
              onChange={(event) => setFiltreCategorie(event.target.value)}
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            >
              <option value="toutes">Toutes les catégories</option>
              {CATEGORIES.map((categorie) => (
                <option key={categorie} value={categorie}>
                  {categorie}
                </option>
              ))}
            </select>

            <select
              value={filtreStatut}
              onChange={(event) => setFiltreStatut(event.target.value)}
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            >
              <option value="tous">Tous les statuts</option>
              <option value="planifie">Planifié</option>
              <option value="en_cours">En cours</option>
              <option value="termine">Terminé</option>
              <option value="annule">Annulé</option>
            </select>

            <div className="flex flex-wrap rounded-xl border border-gray-300 p-1 dark:border-gray-700">
              {(["jour", "semaine", "mois", "liste"] as Vue[]).map(
                (item) => (
                  <button
                    key={item}
                    onClick={() => setVue(item)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize ${
                      vue === item
                        ? "bg-[#0078b8] text-white"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            </div>
          </div>
        </section>

        {vue !== "liste" && (
          <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => changerPeriode(-1)}
                className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700"
              >
                ←
              </button>
              <button
                onClick={() => setDateReference(new Date())}
                className="rounded-lg border border-gray-300 px-4 py-2 font-semibold dark:border-gray-700"
              >
                Aujourd'hui
              </button>
              <button
                onClick={() => changerPeriode(1)}
                className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700"
              >
                →
              </button>
            </div>

            <h2 className="text-lg font-bold capitalize text-gray-900 dark:text-white">
              {titrePeriode()}
            </h2>
          </section>
        )}

        {vue === "mois" && (
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
              {JOURS.map((jour) => (
                <div
                  key={jour}
                  className="p-3 text-center text-xs font-bold text-gray-500"
                >
                  {jour}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {joursVueMois.map((date) => {
                const iso = isoLocal(date);
                const evenementsJour = evenementsFiltres.filter(
                  (item) => item.date_evenement === iso
                );
                const horsMois =
                  date.getMonth() !== dateReference.getMonth();

                return (
                  <div
                    key={iso}
                    onClick={() => ouvrirCreation(iso)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const id = event.dataTransfer.getData("text/plain");
                      if (id) deplacerEvenement(id, iso);
                    }}
                    className={`min-h-36 cursor-pointer border-b border-r border-gray-200 p-2 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50 ${
                      horsMois ? "bg-gray-50/70 dark:bg-gray-950/50" : ""
                    }`}
                  >
                    <div
                      className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                        iso === aujourdHui
                          ? "bg-[#0078b8] text-white"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {date.getDate()}
                    </div>

                    <div className="space-y-1">
                      {evenementsJour.slice(0, 4).map((evenement) =>
                        carteEvenement(evenement, true)
                      )}

                      {evenementsJour.length > 4 && (
                        <p className="text-xs font-semibold text-gray-500">
                          +{evenementsJour.length - 4} autre(s)
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {vue === "semaine" && (
          <section className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="min-w-[1100px]">
              <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-gray-200 dark:border-gray-800">
                <div className="p-3" />
                {joursVueSemaine.map((date) => {
                  const iso = isoLocal(date);
                  return (
                    <button
                      key={iso}
                      onClick={() => ouvrirCreation(iso)}
                      className="border-l border-gray-200 p-3 text-center dark:border-gray-800"
                    >
                      <p className="text-xs font-bold uppercase text-gray-500">
                        {date.toLocaleDateString("fr-FR", {
                          weekday: "short",
                        })}
                      </p>
                      <p
                        className={`mx-auto mt-1 flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold ${
                          iso === aujourdHui
                            ? "bg-[#0078b8] text-white"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {date.getDate()}
                      </p>
                    </button>
                  );
                })}
              </div>

              {HEURES.map((heure) => (
                <div
                  key={heure}
                  className="grid min-h-24 grid-cols-[80px_repeat(7,1fr)] border-b border-gray-200 dark:border-gray-800"
                >
                  <div className="p-2 text-right text-xs text-gray-500">
                    {String(heure).padStart(2, "0")}:00
                  </div>

                  {joursVueSemaine.map((date) => {
                    const iso = isoLocal(date);
                    const evenementsCase = evenementsFiltres.filter(
                      (item) =>
                        item.date_evenement === iso &&
                        Number(item.heure_debut?.slice(0, 2) || 0) === heure
                    );

                    return (
                      <div
                        key={`${iso}-${heure}`}
                        onDoubleClick={() =>
                          ouvrirCreation(
                            iso,
                            `${String(heure).padStart(2, "0")}:00`
                          )
                        }
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          const id =
                            event.dataTransfer.getData("text/plain");
                          if (id) deplacerEvenement(id, iso);
                        }}
                        className="space-y-1 border-l border-gray-200 p-1 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                      >
                        {evenementsCase.map((evenement) =>
                          carteEvenement(evenement, true)
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        )}

        {vue === "jour" && (
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {HEURES.map((heure) => {
              const iso = isoLocal(dateReference);
              const evenementsHeure = evenementsFiltres.filter(
                (item) =>
                  item.date_evenement === iso &&
                  Number(item.heure_debut?.slice(0, 2) || 0) === heure
              );

              return (
                <div
                  key={heure}
                  onDoubleClick={() =>
                    ouvrirCreation(
                      iso,
                      `${String(heure).padStart(2, "0")}:00`
                    )
                  }
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const id = event.dataTransfer.getData("text/plain");
                    if (id) deplacerEvenement(id, iso);
                  }}
                  className="grid min-h-24 grid-cols-[90px_1fr] border-b border-gray-200 dark:border-gray-800"
                >
                  <div className="p-3 text-right text-sm text-gray-500">
                    {String(heure).padStart(2, "0")}:00
                  </div>
                  <div className="space-y-2 border-l border-gray-200 p-2 dark:border-gray-800">
                    {evenementsHeure.map((evenement) =>
                      carteEvenement(evenement)
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {vue === "liste" && (
          <section className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-gray-50 text-left text-gray-600 dark:bg-gray-950 dark:text-gray-400">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Événement</th>
                  <th className="p-4">Catégorie</th>
                  <th className="p-4">Équipement</th>
                  <th className="p-4">Prestataire</th>
                  <th className="p-4">Récurrence</th>
                  <th className="p-4">Priorité</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {evenementsFiltres.map((evenement) => (
                  <tr
                    key={evenement.id}
                    className="border-t border-gray-200 dark:border-gray-800"
                  >
                    <td className="p-4">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatDate(evenement.date_evenement)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatHeure(evenement.heure_debut)}
                        {evenement.heure_fin
                          ? ` – ${formatHeure(evenement.heure_fin)}`
                          : ""}
                      </p>
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() => ouvrirModification(evenement)}
                        className="text-left"
                      >
                        <p className="font-semibold text-gray-900 hover:underline dark:text-white">
                          {evenement.titre}
                        </p>
                        <p className="max-w-72 truncate text-xs text-gray-500">
                          {evenement.description || "—"}
                        </p>
                      </button>
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${couleurCategorie(
                          evenement.categorie
                        )}`}
                      >
                        {evenement.categorie}
                      </span>
                    </td>

                    <td className="p-4 text-gray-700 dark:text-gray-300">
                      {nomEquipement(evenement.equipement_id)}
                    </td>

                    <td className="p-4 text-gray-700 dark:text-gray-300">
                      {nomPrestataire(evenement.prestataire_id)}
                    </td>

                    <td className="p-4 text-gray-700 dark:text-gray-300">
                      {recurrenceTexte(evenement)}
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${couleurPriorite(
                          evenement.priorite
                        )}`}
                      >
                        {evenement.priorite}
                      </span>
                    </td>

                    <td className="p-4">
                      <select
                        value={evenement.statut}
                        onChange={(event) =>
                          modifierStatut(
                            evenement,
                            event.target.value as Statut
                          )
                        }
                        className="rounded-lg border border-gray-300 bg-white p-2 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                      >
                        <option value="planifie">Planifié</option>
                        <option value="en_cours">En cours</option>
                        <option value="termine">Terminé</option>
                        <option value="annule">Annulé</option>
                      </select>
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() => ouvrirModification(evenement)}
                        className="rounded-lg bg-[#0078b8] px-3 py-2 font-semibold text-white"
                      >
                        Ouvrir
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && evenementsFiltres.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-8 text-center text-gray-500"
                    >
                      Aucun événement trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {loading && (
              <p className="p-8 text-center text-gray-500">
                Chargement...
              </p>
            )}
          </section>
        )}
      </div>

      {modalOuverte && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) fermerModal();
          }}
        >
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-800">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {evenementSelectionne
                    ? "Modifier l'événement"
                    : "Nouvel événement"}
                </h2>
                {evenementSelectionne && (
                  <p className="mt-1 text-sm text-gray-500">
                    {libelleStatut(evenementSelectionne.statut)}
                  </p>
                )}
              </div>

              <button
                onClick={fermerModal}
                className="rounded-lg px-3 py-2 text-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Titre *
                </span>
                <input
                  value={formulaire.titre}
                  onChange={(event) =>
                    setFormulaire((ancien) => ({
                      ...ancien,
                      titre: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </label>

              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Catégorie
                </span>
                <select
                  value={formulaire.categorie}
                  onChange={(event) =>
                    setFormulaire((ancien) => ({
                      ...ancien,
                      categorie: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  {CATEGORIES.map((categorie) => (
                    <option key={categorie}>{categorie}</option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Date *
                </span>
                <input
                  type="date"
                  value={formulaire.date_evenement}
                  onChange={(event) =>
                    setFormulaire((ancien) => ({
                      ...ancien,
                      date_evenement: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </label>

              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Heure de début
                </span>
                <input
                  type="time"
                  value={formulaire.heure_debut}
                  onChange={(event) =>
                    setFormulaire((ancien) => ({
                      ...ancien,
                      heure_debut: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </label>

              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Heure de fin
                </span>
                <input
                  type="time"
                  value={formulaire.heure_fin}
                  onChange={(event) =>
                    setFormulaire((ancien) => ({
                      ...ancien,
                      heure_fin: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </label>

              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Priorité
                </span>
                <select
                  value={formulaire.priorite}
                  onChange={(event) =>
                    setFormulaire((ancien) => ({
                      ...ancien,
                      priorite: event.target.value as Priorite,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  <option value="basse">Basse</option>
                  <option value="normale">Normale</option>
                  <option value="haute">Haute</option>
                  <option value="critique">Critique</option>
                </select>
              </label>

              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Statut
                </span>
                <select
                  value={formulaire.statut}
                  onChange={(event) =>
                    setFormulaire((ancien) => ({
                      ...ancien,
                      statut: event.target.value as Statut,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  <option value="planifie">Planifié</option>
                  <option value="en_cours">En cours</option>
                  <option value="termine">Terminé</option>
                  <option value="annule">Annulé</option>
                </select>
              </label>

              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Équipement
                </span>
                <select
                  value={formulaire.equipement_id}
                  onChange={(event) =>
                    setFormulaire((ancien) => ({
                      ...ancien,
                      equipement_id: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  <option value="">Aucun équipement</option>
                  {equipements.map((equipement) => (
                    <option key={equipement.id} value={equipement.id}>
                      {equipement.numero
                        ? `${equipement.nom} · ${equipement.numero}`
                        : equipement.nom}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Prestataire
                </span>
                <select
                  value={formulaire.prestataire_id}
                  onChange={(event) =>
                    setFormulaire((ancien) => ({
                      ...ancien,
                      prestataire_id: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  <option value="">Aucun prestataire</option>
                  {prestataires.map((prestataire) => (
                    <option key={prestataire.id} value={prestataire.id}>
                      {prestataire.nom}
                    </option>
                  ))}
                </select>
              </label>

              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Description
                </span>
                <textarea
                  value={formulaire.description}
                  onChange={(event) =>
                    setFormulaire((ancien) => ({
                      ...ancien,
                      description: event.target.value,
                    }))
                  }
                  className="min-h-28 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </label>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800 md:col-span-2">
                <label className="flex cursor-pointer items-center gap-3 font-semibold text-gray-900 dark:text-white">
                  <input
                    type="checkbox"
                    checked={formulaire.recurrent}
                    onChange={(event) =>
                      setFormulaire((ancien) => ({
                        ...ancien,
                        recurrent: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Événement récurrent
                </label>

                {!formulaire.recurrent && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    L’événement sera enregistré comme une intervention ponctuelle.
                  </p>
                )}

                {formulaire.recurrent && (
                  <div className="mt-4 space-y-4">
                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Fréquence
                      </span>

                      <select
                        value={frequenceDepuisPeriodicite(
                          formulaire.periodicite_valeur,
                          formulaire.periodicite_unite
                        )}
                        onChange={(event) =>
                          setFormulaire((ancien) =>
                            appliquerFrequence(
                              ancien,
                              event.target.value as FrequencePreset
                            )
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                      >
                        {FREQUENCES.map((frequence) => (
                          <option
                            key={frequence.value}
                            value={frequence.value}
                          >
                            {frequence.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {frequenceDepuisPeriodicite(
                      formulaire.periodicite_valeur,
                      formulaire.periodicite_unite
                    ) === "personnalise" && (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label>
                          <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Tous les
                          </span>

                          <input
                            type="number"
                            min={1}
                            max={999}
                            value={formulaire.periodicite_valeur}
                            onChange={(event) =>
                              setFormulaire((ancien) => ({
                                ...ancien,
                                periodicite_valeur: Math.max(
                                  1,
                                  Number(event.target.value) || 1
                                ),
                              }))
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                          />
                        </label>

                        <label>
                          <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Unité
                          </span>

                          <select
                            value={formulaire.periodicite_unite}
                            onChange={(event) =>
                              setFormulaire((ancien) => ({
                                ...ancien,
                                periodicite_unite:
                                  event.target.value as Unite,
                              }))
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                          >
                            <option value="jour">Jour(s)</option>
                            <option value="semaine">Semaine(s)</option>
                            <option value="mois">Mois</option>
                            <option value="annee">Année(s)</option>
                          </select>
                        </label>
                      </div>
                    )}

                    <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
                      <p className="font-semibold">
                        Récurrence enregistrée :{" "}
                        {recurrenceTexte({
                          ...formulaire,
                          id: "",
                          description: formulaire.description || null,
                          heure_debut: formulaire.heure_debut || null,
                          heure_fin: formulaire.heure_fin || null,
                          periodicite_valeur:
                            formulaire.periodicite_valeur,
                          periodicite_unite:
                            formulaire.periodicite_unite,
                          equipement_id:
                            formulaire.equipement_id || null,
                          prestataire_id:
                            formulaire.prestataire_id || null,
                          actif: true,
                        })}
                      </p>

                      {formulaire.date_evenement && (
                        <p className="mt-1">
                          Prochaine échéance théorique :{" "}
                          <strong>
                            {formatDate(
                              ajouterPeriodicite(
                                formulaire.date_evenement,
                                formulaire.periodicite_valeur,
                                formulaire.periodicite_unite
                              )
                            )}
                          </strong>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 p-5 dark:border-gray-800 sm:flex-row sm:justify-between">
              <div>
                {evenementSelectionne && (
                  <button
                    onClick={() =>
                      supprimerEvenement(evenementSelectionne)
                    }
                    disabled={saving}
                    className="w-full rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50 sm:w-auto"
                  >
                    Supprimer
                  </button>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  onClick={fermerModal}
                  disabled={saving}
                  className="rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
                >
                  Annuler
                </button>

                <button
                  onClick={enregistrerEvenement}
                  disabled={saving}
                  className="rounded-xl bg-[#0078b8] px-5 py-3 font-semibold text-white hover:bg-[#00649a] disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}