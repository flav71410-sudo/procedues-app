import { supabase } from "@/lib/supabase";

export type DashboardStats = {
  equipements: number;
  plans: number;
  alertes: number;
  verifications: number;
};

export type DashboardChartItem = {
  label: string;
  value: number;
};

export type DashboardAlert = {
  id: string;
  title: string;
  description: string;
  level: "urgent" | "warning";
  href: string;
};

export type DashboardHealthScore = {
  score: number;
  equipementsEnService: number;
  equipementsHorsService: number;
  equipementsAControler: number;
  fichesIncompletes: number;
};

export type DashboardSupervisionEquipment = {
  id: string;
  numero: string;
  nom: string;
  etat: string | null;
  type: string;
  position_x: number | null;
  position_y: number | null;
};

export type DashboardSupervision = {
  plan: {
    id: string;
    nom: string;
    image_url: string;
  } | null;

  equipements: DashboardSupervisionEquipment[];
  equipementsCritiques: DashboardSupervisionEquipment[];
};

export type DashboardData = {
  stats: DashboardStats;
  healthScore: DashboardHealthScore;
  equipementsParType: DashboardChartItem[];
  equipementsParEtat: DashboardChartItem[];
  alertes: DashboardAlert[];
  supervision: DashboardSupervision;
};
type TypeEquipementRelation =
  | {
      nom: string | null;
    }
  | {
      nom: string | null;
    }[]
  | null;

type EquipementDashboardRow = {
  id: string;
  numero: string | null;
  nom: string | null;
  etat: string | null;
  plan_id: string | null;
  position_x: number | null;
  position_y: number | null;

  types_equipements: TypeEquipementRelation;
};

function normaliserValeur(
  valeur: string | null | undefined
): string {
  return valeur?.trim().toLowerCase() ?? "";
}

function recupererNomType(
  relation: TypeEquipementRelation
): string {
  if (!relation) {
    return "Type non défini";
  }

  if (Array.isArray(relation)) {
    return relation[0]?.nom?.trim() || "Type non défini";
  }

  return relation.nom?.trim() || "Type non défini";
}

function estEnService(etat: string | null) {
  const valeur = normaliserValeur(etat);

  return (
    valeur === "en service" ||
    valeur === "fonctionnel" ||
    valeur === "conforme"
  );
}

function estHorsService(etat: string | null) {
  const valeur = normaliserValeur(etat);

  return (
    valeur === "hors service" ||
    valeur === "hs" ||
    valeur === "défectueux" ||
    valeur === "defectueux"
  );
}

function estAControler(etat: string | null) {
  const valeur = normaliserValeur(etat);

  return [
    "à contrôler",
    "a contrôler",
    "à controler",
    "a controler",
    "à vérifier",
    "a vérifier",
    "à verifier",
    "a verifier",
    "maintenance",
    "en maintenance",
  ].includes(valeur);
}

function regrouperParLibelle(
  valeurs: string[]
): DashboardChartItem[] {
  const compteurs = valeurs.reduce<Record<string, number>>(
    (accumulateur, valeur) => {
      const libelle = valeur.trim() || "Non défini";

      accumulateur[libelle] =
        (accumulateur[libelle] ?? 0) + 1;

      return accumulateur;
    },
    {}
  );

  return Object.entries(compteurs)
    .map(([label, value]) => ({
      label,
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

function calculerHealthScore(
  equipements: EquipementDashboardRow[]
): DashboardHealthScore {
  const total = equipements.length;

  if (total === 0) {
    return {
      score: 100,
      equipementsEnService: 0,
      equipementsHorsService: 0,
      equipementsAControler: 0,
      fichesIncompletes: 0,
    };
  }

  const equipementsEnService = equipements.filter(
    (equipement) => estEnService(equipement.etat)
  ).length;

  const equipementsHorsService = equipements.filter(
    (equipement) => estHorsService(equipement.etat)
  ).length;

  const equipementsAControler = equipements.filter(
    (equipement) => estAControler(equipement.etat)
  ).length;

  const fichesIncompletes = equipements.filter(
    (equipement) => {
      const typeNonDefini =
        recupererNomType(equipement.types_equipements) ===
        "Type non défini";

      const etatNonDefini =
        normaliserValeur(equipement.etat) === "";

      const numeroNonDefini =
        normaliserValeur(equipement.numero) === "";

      const nomNonDefini =
        normaliserValeur(equipement.nom) === "";

      return (
        typeNonDefini ||
        etatNonDefini ||
        numeroNonDefini ||
        nomNonDefini
      );
    }
  ).length;

  const penaliteHorsService =
    (equipementsHorsService / total) * 50;

  const penaliteAControler =
    (equipementsAControler / total) * 25;

  const penaliteFichesIncompletes =
    (fichesIncompletes / total) * 15;

  const equipementsSansEtatReconnu = equipements.filter(
    (equipement) =>
      !estEnService(equipement.etat) &&
      !estHorsService(equipement.etat) &&
      !estAControler(equipement.etat)
  ).length;

  const penaliteEtatNonReconnu =
    (equipementsSansEtatReconnu / total) * 10;

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          penaliteHorsService -
          penaliteAControler -
          penaliteFichesIncompletes -
          penaliteEtatNonReconnu
      )
    )
  );

  return {
    score,
    equipementsEnService,
    equipementsHorsService,
    equipementsAControler,
    fichesIncompletes,
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const [
  equipementsResult,
  plansResult,
  verificationsResult,
  planningResult,
] = await Promise.all([
  supabase
    .from("equipements")
    .select(
      `
        id,
        numero,
        nom,
        etat,
        plan_id,
        position_x,
        position_y,
        types_equipements (
          nom
        )
      `
    )
    .order("numero", {
      ascending: true,
    }),

  supabase
    .from("plans")
    .select("id, nom, image_url", {
      count: "exact",
    })
    .order("nom", {
      ascending: true,
    }),

  supabase
    .from("equipements_verifications")
    .select("*", {
      count: "exact",
      head: true,
    }),

  supabase
    .from("planning_evenements")
    .select(
      "id, titre, date_evenement, heure_debut, statut, priorite, categorie"
    )
    .eq("actif", true)
    .neq("statut", "annule")
    .order("date_evenement", { ascending: true })
    .order("heure_debut", {
      ascending: true,
      nullsFirst: false,
    }),
]);



  if (equipementsResult.error) {
    throw new Error(equipementsResult.error.message);
  }

  if (plansResult.error) {
    throw new Error(plansResult.error.message);
  }

  if (verificationsResult.error) {
    throw new Error(verificationsResult.error.message);
  }

  if (planningResult.error) {
    throw new Error(planningResult.error.message);
  }

  const equipements =
    (equipementsResult.data ??
      []) as EquipementDashboardRow[];

  const healthScore = calculerHealthScore(equipements);

  const equipementsHorsService = equipements.filter(
    (equipement) => estHorsService(equipement.etat)
  );

  const equipementsAControler = equipements.filter(
    (equipement) => estAControler(equipement.etat)
  );

  const equipementsSansType = equipements.filter(
    (equipement) =>
      recupererNomType(equipement.types_equipements) ===
      "Type non défini"
  );

  const equipementsSansEtat = equipements.filter(
    (equipement) =>
      normaliserValeur(equipement.etat) === ""
  );

  const equipementsParType = regrouperParLibelle(
    equipements.map((equipement) =>
      recupererNomType(
        equipement.types_equipements
      )
    )
  );

  const equipementsParEtat = regrouperParLibelle(
    equipements.map(
      (equipement) =>
        equipement.etat?.trim() || "État non défini"
    )
  );

  const dateLocaleIso = (date = new Date()) => {
    const decalage = date.getTimezoneOffset() * 60_000;

    return new Date(date.getTime() - decalage)
      .toISOString()
      .slice(0, 10);
  };

  const aujourdHui = dateLocaleIso();
  const dansTrenteJoursDate = new Date();
  dansTrenteJoursDate.setDate(dansTrenteJoursDate.getDate() + 30);
  const dansTrenteJours = dateLocaleIso(dansTrenteJoursDate);

  const planning = planningResult.data ?? [];

  const controlesEnRetard = planning.filter(
    (evenement) =>
      evenement.date_evenement < aujourdHui &&
      evenement.statut !== "termine"
  );

  const controlesDuJour = planning.filter(
    (evenement) =>
      evenement.date_evenement === aujourdHui &&
      evenement.statut !== "termine"
  );

  const prochainesVerifications = planning.filter(
    (evenement) =>
      evenement.date_evenement >= aujourdHui &&
      evenement.date_evenement <= dansTrenteJours &&
      evenement.statut !== "termine"
  );

  const alertes: DashboardAlert[] = [];

  if (controlesEnRetard.length > 0) {
    alertes.push({
      id: "planning-en-retard",
      title: `${controlesEnRetard.length} contrôle${
        controlesEnRetard.length > 1 ? "s" : ""
      } en retard`,
      description:
        "Des vérifications planifiées ont dépassé leur date d’échéance.",
      level: "urgent",
      href: "/planning",
    });
  }

  if (controlesDuJour.length > 0) {
    alertes.push({
      id: "planning-aujourdhui",
      title: `${controlesDuJour.length} intervention${
        controlesDuJour.length > 1 ? "s" : ""
      } aujourd’hui`,
      description:
        "Consulte le planning pour suivre les contrôles programmés aujourd’hui.",
      level: "warning",
      href: "/planning",
    });
  }

  if (equipementsHorsService.length > 0) {
    alertes.push({
      id: "equipements-hors-service",
      title: `${equipementsHorsService.length} équipement${
        equipementsHorsService.length > 1 ? "s" : ""
      } hors service`,
      description:
        "Une action corrective ou une intervention doit être programmée.",
      level: "urgent",
      href: "/equipements",
    });
  }

  if (equipementsAControler.length > 0) {
    alertes.push({
      id: "equipements-a-controler",
      title: `${equipementsAControler.length} équipement${
        equipementsAControler.length > 1 ? "s" : ""
      } à contrôler`,
      description:
        "Ces équipements nécessitent une vérification ou une intervention.",
      level: "warning",
      href: "/equipements",
    });
  }

  if (equipementsSansType.length > 0) {
    alertes.push({
      id: "equipements-sans-type",
      title: `${equipementsSansType.length} équipement${
        equipementsSansType.length > 1 ? "s" : ""
      } sans type`,
      description:
        "Complète leur fiche pour améliorer le classement et les statistiques.",
      level: "warning",
      href: "/equipements",
    });
  }

  if (equipementsSansEtat.length > 0) {
    alertes.push({
      id: "equipements-sans-etat",
      title: `${equipementsSansEtat.length} équipement${
        equipementsSansEtat.length > 1 ? "s" : ""
      } sans état`,
      description:
        "Ces équipements ne peuvent pas être intégrés correctement dans le suivi de disponibilité.",
      level: "warning",
      href: "/equipements",
    });
  }

  const plans = plansResult.data ?? [];

const planPrincipal =
  plans.find((plan) =>
    equipements.some(
      (equipement) =>
        equipement.plan_id === plan.id &&
        equipement.position_x !== null &&
        equipement.position_y !== null
    )
  ) ??
  plans[0] ??
  null;

const equipementsPlan =
  planPrincipal === null
    ? []
    : equipements
        .filter(
          (equipement) =>
            equipement.plan_id === planPrincipal.id
        )
        .map((equipement) => ({
          id: equipement.id,

          numero:
            equipement.numero?.trim() ||
            "Numéro non défini",

          nom:
            equipement.nom?.trim() ||
            "Équipement sans nom",

          etat: equipement.etat,

          type: recupererNomType(
            equipement.types_equipements
          ),

          position_x: equipement.position_x,
          position_y: equipement.position_y,
        }));

const equipementsCritiquesPlan =
  equipementsPlan.filter(
    (equipement) =>
      estHorsService(equipement.etat) ||
      estAControler(equipement.etat)
  );

  return {
  stats: {
    equipements: equipements.length,
    plans: plansResult.count ?? plans.length,
    alertes:
      controlesEnRetard.length +
      equipementsHorsService.length +
      equipementsAControler.length,
    verifications: prochainesVerifications.length,
  },

  healthScore,
  equipementsParType,
  equipementsParEtat,
  alertes,

  supervision: {
  plan: planPrincipal
    ? {
        id: planPrincipal.id,
        nom: planPrincipal.nom,
        image_url: planPrincipal.image_url,
      }
    : null,

  equipements: equipementsPlan,

  equipementsCritiques:
    equipementsCritiquesPlan,
},
};
}