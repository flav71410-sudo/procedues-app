import type { ElementType } from "react";
import {
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  Home,
  Map,
  Package,
  ScrollText,
  Settings,
  Store,
  TrendingUp,
  UserCircle,
  Users,
  Wrench,
} from "lucide-react";

import type { Permission } from "@/lib/permissions";

export type NavigationItem = {
  label: string;
  href: string;
  icon: ElementType;
  permission: Permission;
};

export const navigation: {
  accueil: NavigationItem[];
  exploitation: NavigationItem[];
  administration: NavigationItem[];
} = {
  accueil: [
    {
      label: "Tableau de bord",
      href: "/dashboard",
      icon: Home,
      permission: "dashboard.view",
    },
    {
      label: "Analytics",
      href: "/analytics",
      icon: BarChart3,
      permission: "dashboard.view",
    },
    {
      label: "Mon profil",
      href: "/profil",
      icon: UserCircle,
      permission: "dashboard.view",
    },
  ],

  exploitation: [
    {
      label: "Consignes",
      href: "/consignes",
      icon: ClipboardList,
      permission: "consignes.view",
    },
    {
      label: "Documents",
      href: "/documents",
      icon: FileText,
      permission: "documents.view",
    },
    {
      label: "Maintenance",
      href: "/maintenance",
      icon: Wrench,
      permission: "maintenance.view",
    },
    {
      label: "Investissements",
      href: "/investissements",
      icon: TrendingUp,
      permission: "investissements.view",
    },
    {
      label: "Planning",
      href: "/planning",
      icon: CalendarDays,
      permission: "planning.view",
    },
    {
      label: "Équipements",
      href: "/equipements",
      icon: Package,
      permission: "equipements.view",
    },
    {
      label: "Plans",
      href: "/plans",
      icon: Map,
      permission: "plans.view",
    },
  ],

  administration: [
    {
      label: "Magasins",
      href: "/admin/magasins",
      icon: Store,
      permission: "stores.view",
    },
    {
      label: "Utilisateurs",
      href: "/admin/utilisateurs",
      icon: Users,
      permission: "users.view",
    },
    {
      label: "Rôles",
      href: "/admin/roles",
      icon: BadgeCheck,
      permission: "roles.manage",
    },
    {
      label: "Secteurs",
      href: "/admin/secteurs",
      icon: Store,
      permission: "settings.manage",
    },
    {
      label: "Prestataires",
      href: "/admin/prestataires",
      icon: Building2,
      permission: "prestataires.view",
    },
    {
      label: "Paramètres",
      href: "/admin/parametres",
      icon: Settings,
      permission: "settings.view",
    },
    {
      label: "Journal système",
      href: "/admin/journal",
      icon: ScrollText,
      permission: "system.journal.view",
    },
    {
      label: "clés d'activation",
      href: "/admin/cles-activation",
      icon: ScrollText,
      permission: "system.journal.view",
    },
  ],
};