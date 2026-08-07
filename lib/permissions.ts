export type AppRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "DM"
  | "PERMANENT";

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
  | "investissements.view"
| "investissements.manage"
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
  | "system.journal.view";
  

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
  "investissements.view",
"investissements.manage",
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
];

export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,

  ADMIN: [
    "dashboard.view",
    "stores.view",
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
    "investissements.view",
"investissements.manage",
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
  ],

  DM: [
    "dashboard.view",
    "stores.view",
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
    "investissements.view",
"investissements.manage",
    "plans.view",
    "journal.view",
    "journal.create",
    "journal.edit",
    "prestataires.view",
  ],

  PERMANENT: [
    "dashboard.view",
    "consignes.view",
    "planning.view",
    "maintenance.view",
    "maintenance.create",
    "equipements.view",
    "documents.view",
    "plans.view",
    "journal.view",
    "journal.create",
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
  }[role];

}

