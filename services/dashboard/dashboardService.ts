import { supabase } from "@/lib/supabase/client";
import { getMaintenances } from "@/services/maintenanceService";
import { getConsignes, getConsigneStats } from "@/services/consignesService";
import { getDevis, getDevisStats } from "@/services/documentsService";
import { getPlanning } from "@/services/planningService";

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

export type DashboardPilotageItem = {
  id: string;
  titre: string;
  sousTitre: string;
  badge: string;
  href: string;
  niveau: "urgent" | "warning" | "info";
};

export type DashboardPilotage = {
  maintenance: {
    total: number;
    ouvertes: number;
    critiques: number;
    retard: number;
  };
  investissements: {
    total: number;
    enAttente: number;
    valides: number;
    signes: number;
    montantEnAttenteHt: number;
  };
  planning: {
    aujourdHui: number;
    semaine: number;
    retard: number;
    aVenir: number;
  };
  consignes: {
    total: number;
    actives: number;
    urgentes: number;
    avecFichier: number;
  };
  priorites: DashboardPilotageItem[];
  prochainsEvenements: DashboardPilotageItem[];
  maintenancesPrioritaires: DashboardPilotageItem[];
  investissementsPrioritaires: DashboardPilotageItem[];
  consignesRecentes: DashboardPilotageItem[];
};

export type DashboardData = {
  stats: DashboardStats;
  healthScore: DashboardHealthScore;
  equipementsParType: DashboardChartItem[];
  equipementsParEtat: DashboardChartItem[];
  alertes: DashboardAlert[];
  supervision: DashboardSupervision;
  pilotage: DashboardPilotage;
};

type TypeEquipementRelation =
  | { nom: string | null }
  | { nom: string | null }[]
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

export type DashboardScope = {
  magasinId: string | null;
  tousMagasins?: boolean;
};

function normaliserValeur(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function recupererNomType(relation: TypeEquipementRelation): string {
  if (!relation) return "Type non défini";
  if (Array.isArray(relation)) {
    return relation[0]?.nom?.trim() || "Type non défini";
  }
  return relation.nom?.trim() || "Type non défini";
}

function estEnService(etat: string | null) {
  const valeur = normaliserValeur(etat);
  return valeur === "en service" || valeur === "fonctionnel" || valeur === "conforme";
}

function estHorsService(etat: string | null) {
  const valeur = normaliserValeur(etat);
  return valeur === "hors service" || valeur === "hs" || valeur === "defectueux";
}

function estAControler(etat: string | null) {
  const valeur = normaliserValeur(etat);
  return [
    "a controler",
    "a verifier",
    "maintenance",
    "en maintenance",
  ].includes(valeur);
}

function regrouperParLibelle(valeurs: string[]): DashboardChartItem[] {
  const compteurs = valeurs.reduce<Record<string, number>>((acc, valeur) => {
    const libelle = valeur.trim() || "Non défini";
    acc[libelle] = (acc[libelle] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(compteurs)
    .map(([label, value]) => ({ label, value }))
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

  const equipementsEnService = equipements.filter((e) => estEnService(e.etat)).length;
  const equipementsHorsService = equipements.filter((e) => estHorsService(e.etat)).length;
  const equipementsAControler = equipements.filter((e) => estAControler(e.etat)).length;
  const fichesIncompletes = equipements.filter((e) =>
    recupererNomType(e.types_equipements) === "Type non défini" ||
    !normaliserValeur(e.etat) ||
    !normaliserValeur(e.numero) ||
    !normaliserValeur(e.nom)
  ).length;

  const equipementsSansEtatReconnu = equipements.filter(
    (e) => !estEnService(e.etat) && !estHorsService(e.etat) && !estAControler(e.etat)
  ).length;

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          (equipementsHorsService / total) * 50 -
          (equipementsAControler / total) * 25 -
          (fichesIncompletes / total) * 15 -
          (equipementsSansEtatReconnu / total) * 10
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

function appliquerFiltreMagasin<T>(requete: T, scope: DashboardScope): T {
  if (scope.tousMagasins) return requete;

  if (!scope.magasinId) {
    throw new Error(
      "Aucun magasin actif. Sélectionne un magasin pour afficher le tableau de bord."
    );
  }

  return (requete as { eq: (column: string, value: string) => T }).eq(
    "magasin_id",
    scope.magasinId
  );
}

function dateLocaleIso(date = new Date()) {
  const decalage = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - decalage).toISOString().slice(0, 10);
}

function debutFinSemaine() {
  const maintenant = new Date();
  const jour = maintenant.getDay();
  const ecartLundi = jour === 0 ? -6 : 1 - jour;
  const debut = new Date(maintenant);
  debut.setHours(0, 0, 0, 0);
  debut.setDate(maintenant.getDate() + ecartLundi);

  const fin = new Date(debut);
  fin.setDate(debut.getDate() + 6);
  fin.setHours(23, 59, 59, 999);

  return {
    debut: dateLocaleIso(debut),
    fin: dateLocaleIso(fin),
  };
}

function formatMontant(value: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatDateCourte(value: string | null | undefined) {
  if (!value) return "Date non renseignée";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(date);
}

export async function getDashboardData(
  scope: DashboardScope
): Promise<DashboardData> {
  let equipementsQuery = supabase
    .from("equipements")
    .select(`
      id,
      numero,
      nom,
      etat,
      plan_id,
      position_x,
      position_y,
      types_equipements (nom)
    `)
    .order("numero", { ascending: true });

  let plansQuery = supabase
    .from("plans")
    .select("id, nom, image_url, image_path", { count: "exact" })
    .order("nom", { ascending: true });

  equipementsQuery = appliquerFiltreMagasin(equipementsQuery, scope);
  plansQuery = appliquerFiltreMagasin(plansQuery, scope);

  const annee = new Date().getFullYear();

  const [
    equipementsResult,
    plansResult,
    maintenances,
    consignes,
    consigneStats,
    devis,
    devisStats,
    planning,
  ] = await Promise.all([
    equipementsQuery,
    plansQuery,
    getMaintenances({
      magasinId: scope.magasinId,
      tousMagasins: Boolean(scope.tousMagasins),
    }),
    getConsignes({
      magasinId: scope.magasinId,
      tousMagasins: Boolean(scope.tousMagasins),
    }),
    getConsigneStats({
      magasinId: scope.magasinId,
      tousMagasins: Boolean(scope.tousMagasins),
    }),
    getDevis(
      {
        magasinId: scope.magasinId,
        tousMagasins: Boolean(scope.tousMagasins),
      },
      annee
    ),
    getDevisStats(
      {
        magasinId: scope.magasinId,
        tousMagasins: Boolean(scope.tousMagasins),
      },
      annee
    ),
    getPlanning({
      magasinId: scope.magasinId,
      tousMagasins: Boolean(scope.tousMagasins),
      statut: "tous",
    }),
  ]);

  if (equipementsResult.error) throw new Error(equipementsResult.error.message);
  if (plansResult.error) throw new Error(plansResult.error.message);

  const equipements = (equipementsResult.data ?? []) as EquipementDashboardRow[];
  const equipementIds = equipements.map((e) => e.id);

  let nombreVerifications = 0;
  if (scope.tousMagasins) {
    const { count, error } = await supabase
      .from("equipements_verifications")
      .select("*", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    nombreVerifications = count ?? 0;
  } else if (equipementIds.length > 0) {
    const { count, error } = await supabase
      .from("equipements_verifications")
      .select("*", { count: "exact", head: true })
      .in("equipement_id", equipementIds);
    if (error) throw new Error(error.message);
    nombreVerifications = count ?? 0;
  }

  const healthScore = calculerHealthScore(equipements);
  const equipementsHorsService = equipements.filter((e) => estHorsService(e.etat));
  const equipementsAControler = equipements.filter((e) => estAControler(e.etat));
  const equipementsSansType = equipements.filter(
    (e) => recupererNomType(e.types_equipements) === "Type non défini"
  );
  const equipementsSansEtat = equipements.filter((e) => !normaliserValeur(e.etat));

  const equipementsParType = regrouperParLibelle(
    equipements.map((e) => recupererNomType(e.types_equipements))
  );
  const equipementsParEtat = regrouperParLibelle(
    equipements.map((e) => e.etat?.trim() || "État non défini")
  );

  const aujourdHui = dateLocaleIso();

  // Fenêtre d'alerte Planning : de J à J+7 inclus.
  const dansSeptJoursDate = new Date();
  dansSeptJoursDate.setDate(dansSeptJoursDate.getDate() + 7);
  const dansSeptJours = dateLocaleIso(dansSeptJoursDate);

  const { debut: debutSemaine, fin: finSemaine } = debutFinSemaine();
  const dansTrenteJoursDate = new Date();
  dansTrenteJoursDate.setDate(dansTrenteJoursDate.getDate() + 30);
  const dansTrenteJours = dateLocaleIso(dansTrenteJoursDate);

  const planningActif = planning.filter(
    (event) => !["annule", "termine"].includes(normaliserValeur(event.statut))
  );

  const planningRetard = planningActif.filter((e) => e.date_evenement < aujourdHui);
  const planningAujourdHui = planningActif.filter((e) => e.date_evenement === aujourdHui);

  const planningDansSeptJours = planningActif.filter(
    (e) =>
      e.date_evenement > aujourdHui &&
      e.date_evenement <= dansSeptJours
  );

  const planningSemaine = planningActif.filter(
    (e) => e.date_evenement >= debutSemaine && e.date_evenement <= finSemaine
  );
  const planningAVenir = planningActif.filter(
    (e) => e.date_evenement >= aujourdHui && e.date_evenement <= dansTrenteJours
  );

  const maintenanceOuvertes = maintenances.filter((m) => {
    const statut = normaliserValeur(m.statut_label);
    return !statut.includes("termine") && !statut.includes("cloture") && !statut.includes("annule");
  });

  const maintenanceCritiques = maintenanceOuvertes.filter((m) => {
    const priorite = normaliserValeur(m.priorite_label);
    const criticite = normaliserValeur(m.criticite_label);
    return priorite.includes("critique") || priorite.includes("urgent") || criticite.includes("critique");
  });

  const maintenancesAvecReserve = maintenances.filter((m) => {
    const resultat = normaliserValeur(m.resultat_label);

    return (
      resultat === "conforme avec reserve" ||
      resultat === "conforme avec reserves" ||
      resultat.includes("avec reserve")
    );
  });

  const maintenancesNonConformes = maintenances.filter((m) => {
    const resultat = normaliserValeur(m.resultat_label);

    return (
      resultat === "non conforme" ||
      resultat === "non-conforme" ||
      resultat.includes("non conforme") ||
      resultat.includes("non-conforme")
    );
  });

  const maintenanceRetard = maintenanceOuvertes.filter((m) => {
    if (!m.date_debut) return false;
    return String(m.date_debut).slice(0, 10) < aujourdHui;
  });

  const devisSignes = devis.filter((d) => d.devis_signe).length;

  function nombreJoursAvant(dateEvenement: string) {
    const debut = new Date(`${aujourdHui}T12:00:00`);
    const fin = new Date(`${dateEvenement}T12:00:00`);

    return Math.round(
      (fin.getTime() - debut.getTime()) /
        (1000 * 60 * 60 * 24)
    );
  }

  const alertes: DashboardAlert[] = [];

  if (maintenanceRetard.length > 0) {
    alertes.push({
      id: "maintenance-retard",
      title: `${maintenanceRetard.length} maintenance${maintenanceRetard.length > 1 ? "s" : ""} en retard`,
      description: "Des interventions ouvertes ont dépassé leur date prévue.",
      level: "urgent",
      href: "/maintenance",
    });
  }

  if (maintenanceCritiques.length > 0) {
    alertes.push({
      id: "maintenance-critique",
      title: `${maintenanceCritiques.length} maintenance${maintenanceCritiques.length > 1 ? "s" : ""} critique${maintenanceCritiques.length > 1 ? "s" : ""}`,
      description: "Des interventions prioritaires nécessitent une attention immédiate.",
      level: "urgent",
      href: "/maintenance",
    });
  }

  if (maintenancesNonConformes.length > 0) {
    alertes.push({
      id: "maintenance-non-conforme",
      title: `${maintenancesNonConformes.length} maintenance${maintenancesNonConformes.length > 1 ? "s" : ""} non conforme${maintenancesNonConformes.length > 1 ? "s" : ""}`,
      description: "Un résultat non conforme nécessite une action corrective et un suivi.",
      level: "urgent",
      href: "/maintenance",
    });
  }

  if (maintenancesAvecReserve.length > 0) {
    alertes.push({
      id: "maintenance-avec-reserve",
      title: `${maintenancesAvecReserve.length} maintenance${maintenancesAvecReserve.length > 1 ? "s" : ""} conforme${maintenancesAvecReserve.length > 1 ? "s" : ""} avec réserve`,
      description: "Des réserves restent à lever malgré un résultat conforme.",
      level: "warning",
      href: "/maintenance",
    });
  }

  if (devisStats.enAttente > 0) {
    alertes.push({
      id: "investissements-attente",
      title: `${devisStats.enAttente} devis en attente`,
      description: `${formatMontant(devisStats.montantEnAttenteHt)} HT restent à arbitrer.`,
      level: "warning",
      href: "/investissements",
    });
  }

  if (planningRetard.length > 0) {
    alertes.push({
      id: "planning-retard",
      title: `${planningRetard.length} événement${planningRetard.length > 1 ? "s" : ""} planning en retard`,
      description: "Des événements planifiés ont dépassé leur date sans être terminés.",
      level: "urgent",
      href:
        planningRetard.length === 1
          ? `/planning/${planningRetard[0].id}`
          : "/planning",
    });
  }

  if (planningAujourdHui.length > 0) {
    alertes.push({
      id: "planning-aujourdhui",
      title: `${planningAujourdHui.length} intervention${planningAujourdHui.length > 1 ? "s" : ""} aujourd’hui`,
      description:
        planningAujourdHui.length === 1
          ? planningAujourdHui[0].titre
          : "Consulte le planning pour organiser la journée.",
      level: "urgent",
      href:
        planningAujourdHui.length === 1
          ? `/planning/${planningAujourdHui[0].id}`
          : "/planning",
    });
  }

  /*
   * Alertes préventives Planning :
   * chaque intervention apparaît à partir de J-7.
   */
  planningDansSeptJours
    .slice()
    .sort((a, b) =>
      a.date_evenement.localeCompare(b.date_evenement)
    )
    .forEach((event) => {
      const jours = nombreJoursAvant(event.date_evenement);

      alertes.push({
        id: `planning-j7-${event.id}`,
        title:
          jours === 1
            ? "Intervention prévue demain"
            : `Intervention prévue dans ${jours} jours`,
        description: `${event.titre} · ${formatDateCourte(event.date_evenement)}`,
        level: "warning",
        href: `/planning/${event.id}`,
      });
    });

  if (equipementsHorsService.length > 0) {
    alertes.push({
      id: "equipements-hors-service",
      title: `${equipementsHorsService.length} équipement${equipementsHorsService.length > 1 ? "s" : ""} hors service`,
      description: "Une action corrective ou une intervention doit être programmée.",
      level: "urgent",
      href: "/equipements",
    });
  }

  if (equipementsAControler.length > 0) {
    alertes.push({
      id: "equipements-a-controler",
      title: `${equipementsAControler.length} équipement${equipementsAControler.length > 1 ? "s" : ""} à contrôler`,
      description: "Ces équipements nécessitent une vérification ou une intervention.",
      level: "warning",
      href: "/equipements",
    });
  }

  if (equipementsSansType.length > 0 || equipementsSansEtat.length > 0) {
    alertes.push({
      id: "equipements-incomplets",
      title: `${equipementsSansType.length + equipementsSansEtat.length} fiche${equipementsSansType.length + equipementsSansEtat.length > 1 ? "s" : ""} équipement à compléter`,
      description: "Certaines fiches n’ont pas de type ou d’état renseigné.",
      level: "warning",
      href: "/equipements",
    });
  }

  const priorites: DashboardPilotageItem[] = [
    ...maintenanceRetard.slice(0, 3).map((m) => ({
      id: `maintenance-${m.id}`,
      titre: m.titre,
      sousTitre: `${m.numero} · ${m.prestataire_label ?? "Sans prestataire"}`,
      badge: "Maintenance en retard",
      href: `/maintenance/${m.id}`,
      niveau: "urgent" as const,
    })),
    ...devis
      .filter((d) => d.statut_devis === "EN_ATTENTE")
      .slice(0, 3)
      .map((d) => ({
        id: `devis-${d.id}`,
        titre: d.titre,
        sousTitre: `${d.prestataire ?? "Sans prestataire"} · ${formatMontant(d.montant_ht)} HT`,
        badge: "Devis à valider",
        href: "/investissements",
        niveau: "warning" as const,
      })),
    ...planningRetard.slice(0, 3).map((e) => ({
      id: `planning-${e.id}`,
      titre: e.titre,
      sousTitre: `Prévu le ${formatDateCourte(e.date_evenement)}`,
      badge: "Planning en retard",
      href: `/planning/${e.id}`,
      niveau: "urgent" as const,
    })),
  ].slice(0, 8);

  const prochainsEvenements = planningAVenir
    .slice()
    .sort((a, b) => a.date_evenement.localeCompare(b.date_evenement))
    .slice(0, 6)
    .map((e) => ({
      id: e.id,
      titre: e.titre,
      sousTitre: `${formatDateCourte(e.date_evenement)}${e.heure_debut ? ` · ${e.heure_debut.slice(0, 5)}` : ""}`,
      badge: e.categorie,
      href: `/planning/${e.id}`,
      niveau: normaliserValeur(e.priorite).includes("urgent") ? "warning" as const : "info" as const,
    }));

  const maintenancesPrioritaires = maintenanceOuvertes
    .slice()
    .sort((a, b) => {
      const aCrit = maintenanceCritiques.some((m) => m.id === a.id) ? 1 : 0;
      const bCrit = maintenanceCritiques.some((m) => m.id === b.id) ? 1 : 0;
      return bCrit - aCrit;
    })
    .slice(0, 5)
    .map((m) => ({
      id: m.id,
      titre: m.titre,
      sousTitre: `${m.numero} · ${m.prestataire_label ?? "Sans prestataire"}`,
      badge: m.priorite_label,
      href: `/maintenance/${m.id}`,
      niveau: maintenanceCritiques.some((x) => x.id === m.id) ? "urgent" as const : "info" as const,
    }));

  const investissementsPrioritaires = devis
    .filter((d) => d.statut_devis === "EN_ATTENTE" || (d.statut_devis === "VALIDE" && !d.devis_signe))
    .slice(0, 5)
    .map((d) => ({
      id: d.id,
      titre: d.titre,
      sousTitre: `${d.prestataire ?? "Sans prestataire"} · ${formatMontant(d.montant_ht)} HT`,
      badge: d.statut_devis === "EN_ATTENTE" ? "À valider" : "À signer",
      href: "/investissements",
      niveau: d.statut_devis === "EN_ATTENTE" ? "warning" as const : "info" as const,
    }));

  const consignesRecentes = consignes
    .filter((c) => c.actif !== false)
    .slice()
    .sort((a, b) => {
      const da = a.created_at ?? a.date_creation ?? "";
      const db = b.created_at ?? b.date_creation ?? "";
      return db.localeCompare(da);
    })
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      titre: c.titre,
      sousTitre: formatDateCourte(c.created_at ?? c.date_creation),
      badge: c.priorite,
      href: `/consignes/${c.id}`,
      niveau: normaliserValeur(c.priorite).includes("urgent") ? "warning" as const : "info" as const,
    }));

  const plans = plansResult.data ?? [];
  const planPrincipal =
    plans.find((plan) =>
      equipements.some(
        (e) => e.plan_id === plan.id && e.position_x !== null && e.position_y !== null
      )
    ) ?? plans[0] ?? null;

  let planPrincipalImageUrl = planPrincipal?.image_url ?? "";

  if (planPrincipal?.image_path) {
    const { data: signedPlanData, error: signedPlanError } = await supabase.storage
      .from("plans")
      .createSignedUrl(planPrincipal.image_path, 60 * 60);

    if (!signedPlanError && signedPlanData?.signedUrl) {
      planPrincipalImageUrl = signedPlanData.signedUrl;
    }
  }

  const equipementsPlan = planPrincipal
    ? equipements
        .filter((e) => e.plan_id === planPrincipal.id)
        .map((e) => ({
          id: e.id,
          numero: e.numero?.trim() || "Numéro non défini",
          nom: e.nom?.trim() || "Équipement sans nom",
          etat: e.etat,
          type: recupererNomType(e.types_equipements),
          position_x: e.position_x,
          position_y: e.position_y,
        }))
    : [];

  return {
    stats: {
      equipements: equipements.length,
      plans: plansResult.count ?? plans.length,
      alertes: alertes.filter((a) => a.level === "urgent").length,
      verifications: nombreVerifications || planningAVenir.length,
    },
    healthScore,
    equipementsParType,
    equipementsParEtat,
    alertes,
    supervision: {
      plan: planPrincipal
        ? { id: planPrincipal.id, nom: planPrincipal.nom, image_url: planPrincipalImageUrl }
        : null,
      equipements: equipementsPlan,
      equipementsCritiques: equipementsPlan.filter(
        (e) => estHorsService(e.etat) || estAControler(e.etat)
      ),
    },
    pilotage: {
      maintenance: {
        total: maintenances.length,
        ouvertes: maintenanceOuvertes.length,
        critiques: maintenanceCritiques.length,
        retard: maintenanceRetard.length,
      },
      investissements: {
        total: devis.length,
        enAttente: devisStats.enAttente,
        valides: devisStats.valides,
        signes: devisSignes,
        montantEnAttenteHt: devisStats.montantEnAttenteHt,
      },
      planning: {
        aujourdHui: planningAujourdHui.length,
        semaine: planningSemaine.length,
        retard: planningRetard.length,
        aVenir: planningAVenir.length,
      },
      consignes: {
        total: consigneStats.total,
        actives: consigneStats.actives,
        urgentes: consigneStats.urgentes,
        avecFichier: consigneStats.avecFichier,
      },
      priorites,
      prochainsEvenements,
      maintenancesPrioritaires,
      investissementsPrioritaires,
      consignesRecentes,
    },
  };
}