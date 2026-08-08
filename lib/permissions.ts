export type AppRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "DM"
  | "PERMANENT"
  | "COLLABORATEUR";

export type Permission =
  | "dashboard.view"
  | "stores.view"
  | "stores.manage"
  | "users.view"
  | "users.manage"
  | "roles.manage"
  | "consignes.view"
  | "consignes.create"
  | "consignes.edit"
  | "consignes.delete"
  | "planning.view"
  | "planning.create"
  | "planning.edit"
  | "planning.delete"
  | "maintenance.view"
  | "maintenance.create"
  | "maintenance.edit"
  | "maintenance.delete"
  | "equipements.view"
  | "equipements.edit"
  | "equipements.delete"
  | "documents.view"
  | "documents.create"
  | "documents.edit"
  | "documents.delete"
  | "plans.view"
  | "plans.edit"
  | "journal.view"
  | "journal.create"
  | "journal.edit"
  | "prestataires.view"
  | "prestataires.manage"
  | "settings.view"
  | "settings.manage"
  | "admin.access"
  | "system.journal.view"
  | "investissements.view"
  | "investissements.create"
  | "investissements.edit"
  | "investissements.delete";

const ALL_PERMISSIONS: Permission[] = [
  "dashboard.view",
  "stores.view",
  "stores.manage",
  "users.view",
  "users.manage",
  "roles.manage",
  "consignes.view",
  "consignes.create",
  "consignes.edit",
  "consignes.delete",
  "planning.view",
  "planning.create",
  "planning.edit",
  "planning.delete",
  "maintenance.view",
  "maintenance.create",
  "maintenance.edit",
  "maintenance.delete",
  "equipements.view",
  "equipements.edit",
  "equipements.delete",
  "documents.view",
  "documents.create",
  "documents.edit",
  "documents.delete",
  "plans.view",
  "plans.edit",
  "journal.view",
  "journal.create",
  "journal.edit",
  "prestataires.view",
  "prestataires.manage",
  "settings.view",
  "settings.manage",
  "admin.access",
  "system.journal.view",
  "investissements.view",
  "investissements.create",
  "investissements.edit",
  "investissements.delete",
];

export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,

  ADMIN: [
    "dashboard.view",
    "users.view",
    "users.manage",
    "consignes.view",
    "consignes.create",
    "consignes.edit",
    "consignes.delete",
    "planning.view",
    "planning.create",
    "planning.edit",
    "planning.delete",
    "maintenance.view",
    "maintenance.create",
    "maintenance.edit",
    "maintenance.delete",
    "equipements.view",
    "equipements.edit",
    "equipements.delete",
    "documents.view",
    "documents.create",
    "documents.edit",
    "documents.delete",
    "plans.view",
    "plans.edit",
    "journal.view",
    "journal.create",
    "journal.edit",
    "prestataires.view",
    "prestataires.manage",
    "settings.view",
    "settings.manage",
    "admin.access",
    "investissements.view",
    "investissements.create",
    "investissements.edit",
    "investissements.delete",
  ],

  DM: [
    "dashboard.view",
    "users.view",
    "consignes.view",
    "consignes.create",
    "consignes.edit",
    "planning.view",
    "planning.create",
    "planning.edit",
    "planning.delete",
    "maintenance.view",
    "maintenance.create",
    "maintenance.edit",
    "equipements.view",
    "equipements.edit",
    "documents.view",
    "documents.create",
    "plans.view",
    "journal.view",
    "journal.create",
    "journal.edit",
    "prestataires.view",
    "investissements.view",
    "investissements.create",
    "investissements.edit",
    "investissements.delete",
  ],

  PERMANENT: [
    "dashboard.view",
    "consignes.view",
    "planning.view",
    "maintenance.view",
    "equipements.view",
    "documents.view",
    "plans.view",
    "journal.view",
  ],

  /*
   * Rôle attribué automatiquement à l'inscription.
   * Il ne donne accès qu'à la page d'accueil afin que l'utilisateur
   * puisse voir le message d'attente d'attribution d'un rôle métier.
   */
  COLLABORATEUR: [
    "dashboard.view",
  ],
};

export function normalizeRole(
  value: string | null | undefined
): AppRole {
  const role = (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[\s/-]+/g, "_");

  if (
    role === "SUPER_ADMIN" ||
    role === "SUPER_ADMINISTRATEUR" ||
    role.includes("SUPER_ADMIN")
  ) {
    return "SUPER_ADMIN";
  }

  if (
    role === "ADMIN" ||
    role === "ADMIN_SECURITE" ||
    role.includes("ADMINISTRATEUR") ||
    role.includes("RESPONSABLE_SECURITE")
  ) {
    return "ADMIN";
  }

  if (role === "DM" || role.includes("DIRECTEUR_MAGASIN")) {
    return "DM";
  }

  if (
    role === "COLLABORATEUR" ||
    role === "COLLAB" ||
    role.includes("COLLABORATEUR")
  ) {
    return "COLLABORATEUR";
  }

  return "PERMANENT";
}

export function permissionsForRole(
  role: AppRole
): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function roleCan(
  role: AppRole,
  permission: Permission
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function roleLabel(role: AppRole): string {
  return {
    SUPER_ADMIN: "Super administrateur",
    ADMIN: "Administrateur / Responsable sécurité",
    DM: "DM",
    PERMANENT: "Permanent",
    COLLABORATEUR: "Collaborateur",
  }[role];
}