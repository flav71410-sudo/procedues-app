export type AppRole =
  | "administrateur"
  | "direction"
  | "permanent";

export type CrudPermissions = {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
};

export type AppPermissions = {
  dashboard: {
    view: boolean;
  };

  consigne: CrudPermissions;
  equipement: CrudPermissions;
  plan: CrudPermissions;
  verification: CrudPermissions;
  maintenance: CrudPermissions;
  document: CrudPermissions;

  securite: {
    view: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
  };

  journalSecurite: {
    view: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
  };

  prestataire: CrudPermissions;

  notification: {
    view: boolean;
    manage: boolean;
  };

  rapport: {
    view: boolean;
    create: boolean;
  };

  utilisateur: {
    view: boolean;
    manage: boolean;
  };

  role: {
    view: boolean;
    manage: boolean;
  };

  parametre: {
    view: boolean;
    manage: boolean;
  };

  journalSysteme: {
    view: boolean;
  };

  administration: {
    view: boolean;
  };
};

const aucunAccesCrud: CrudPermissions = {
  view: false,
  create: false,
  update: false,
  delete: false,
};

const lectureSeuleCrud: CrudPermissions = {
  view: true,
  create: false,
  update: false,
  delete: false,
};

const accesCompletCrud: CrudPermissions = {
  view: true,
  create: true,
  update: true,
  delete: true,
};

export const permissionsParRole: Record<
  AppRole,
  AppPermissions
> = {
  administrateur: {
    dashboard: {
      view: true,
    },

    consigne: accesCompletCrud,
    equipement: accesCompletCrud,
    plan: accesCompletCrud,
    verification: accesCompletCrud,
    maintenance: accesCompletCrud,
    document: accesCompletCrud,

    securite: {
      view: true,
      create: true,
      update: true,
      delete: true,
    },

    journalSecurite: {
      view: true,
      create: true,
      update: true,
      delete: true,
    },

    prestataire: accesCompletCrud,

    notification: {
      view: true,
      manage: true,
    },

    rapport: {
      view: true,
      create: true,
    },

    utilisateur: {
      view: true,
      manage: true,
    },

    role: {
      view: true,
      manage: true,
    },

    parametre: {
      view: true,
      manage: true,
    },

    journalSysteme: {
      view: true,
    },

    administration: {
      view: true,
    },
  },

  direction: {
    dashboard: {
      view: true,
    },

    consigne: accesCompletCrud,
    equipement: accesCompletCrud,
    plan: accesCompletCrud,
    verification: accesCompletCrud,
    maintenance: accesCompletCrud,
    document: accesCompletCrud,

    securite: {
      view: true,
      create: false,
      update: false,
      delete: false,
    },

    journalSecurite: {
      view: true,
      create: false,
      update: false,
      delete: false,
    },

    prestataire: lectureSeuleCrud,

    notification: {
      view: true,
      manage: false,
    },

    rapport: {
      view: true,
      create: true,
    },

    utilisateur: {
      view: false,
      manage: false,
    },

    role: {
      view: false,
      manage: false,
    },

    parametre: {
      view: false,
      manage: false,
    },

    journalSysteme: {
      view: false,
    },

    administration: {
      view: false,
    },
  },

  permanent: {
    dashboard: {
      view: true,
    },

    consigne: lectureSeuleCrud,
    equipement: lectureSeuleCrud,
    plan: lectureSeuleCrud,
    verification: lectureSeuleCrud,
    maintenance: lectureSeuleCrud,
    document: lectureSeuleCrud,

    securite: {
      view: false,
      create: false,
      update: false,
      delete: false,
    },

    journalSecurite: {
      view: false,
      create: false,
      update: false,
      delete: false,
    },

    prestataire: aucunAccesCrud,

    notification: {
      view: true,
      manage: false,
    },

    rapport: {
      view: false,
      create: false,
    },

    utilisateur: {
      view: false,
      manage: false,
    },

    role: {
      view: false,
      manage: false,
    },

    parametre: {
      view: false,
      manage: false,
    },

    journalSysteme: {
      view: false,
    },

    administration: {
      view: false,
    },
  },
};

export function normaliserRole(
  role: string | null | undefined
): AppRole {
  const valeur = role
    ?.trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    valeur === "administrateur" ||
    valeur === "admin" ||
    valeur === "responsable securite" ||
    valeur === "responsable sécurité"
  ) {
    return "administrateur";
  }

  if (
    valeur === "direction" ||
    valeur === "dm" ||
    valeur === "direction magasin"
  ) {
    return "direction";
  }

  return "permanent";
}

export function getPermissions(
  role: string | null | undefined
): AppPermissions {
  const roleNormalise = normaliserRole(role);

  return permissionsParRole[roleNormalise];
}

export function hasRole(
  roleUtilisateur: string | null | undefined,
  rolesAutorises: AppRole[]
): boolean {
  const roleNormalise = normaliserRole(roleUtilisateur);

  return rolesAutorises.includes(roleNormalise);
}