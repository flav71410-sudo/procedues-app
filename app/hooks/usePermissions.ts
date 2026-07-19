"use client";

import { useMemo } from "react";

import {
  AppPermissions,
  AppRole,
  getPermissions,
  normaliserRole,
} from "@/lib/permissions";

type UsePermissionsResult = {
  role: AppRole;
  permissions: AppPermissions;
  isAdministrateur: boolean;
  isDirection: boolean;
  isPermanent: boolean;
};

export function usePermissions(
  roleUtilisateur: string | null | undefined
): UsePermissionsResult {
  return useMemo(() => {
    const role = normaliserRole(roleUtilisateur);
    const permissions = getPermissions(role);

    return {
      role,
      permissions,
      isAdministrateur: role === "administrateur",
      isDirection: role === "direction",
      isPermanent: role === "permanent",
    };
  }, [roleUtilisateur]);
}