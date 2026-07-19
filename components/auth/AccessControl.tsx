"use client";

import { ReactNode } from "react";

type Role = "ADMIN" | "DM" | "PERMANENT";

type AccessControlProps = {
  role: string;
  roles: Role[];
  children: ReactNode;
};

export default function AccessControl({
  role,
  roles,
  children,
}: AccessControlProps) {
  if (!roles.includes(role as Role)) {
    return null;
  }

  return <>{children}</>;
}