"use client";

import { useMemo } from "react";

import {
  normalizeRole,
  permissionsForRole,
  type AppRole,
  type Permission,
} from "@/lib/permissions";

type UsePermissionsResult = {
  role: AppRole;
  permissions: readonly Permission[];
  isAdministrateur: boolean;
  isDirection: boolean;
  isPermanent: boolean;
};

export function usePermissions(
  roleUtilisateur: string | null | undefined
): UsePermissionsResult {
  return useMemo(() => {
    const role = normalizeRole(roleUtilisateur);
    const permissions = permissionsForRole(role);

    return {
      role,
      permissions,
      isAdministrateur:
        role === "SUPER_ADMIN" || role === "ADMIN",
      isDirection: role === "DM",
      isPermanent: role === "PERMANENT",
    };
  }, [roleUtilisateur]);
}