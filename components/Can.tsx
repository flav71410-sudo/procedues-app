"use client";

import type { ReactNode } from "react";
import type { Permission } from "@/lib/permissions";
import { useAuth } from "@/providers/AuthProvider";

type CanProps = {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
};

export default function Can({
  permission,
  children,
  fallback = null,
}: CanProps) {
  const { can, loading } = useAuth();

  if (loading) {
    return null;
  }

  return can(permission) ? <>{children}</> : <>{fallback}</>;
}
