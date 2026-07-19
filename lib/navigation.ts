import {
  Home,
  ClipboardList,
  FileText,
  Shield,
  Wrench,
  CalendarDays,
  Settings,
  Users,
  BadgeCheck,
  Store,
  Building2,
  ScrollText,
  Package,
  Map,
} from "lucide-react";
import { ElementType } from "react";

export type Role = "ADMIN" | "DM" | "PERMANENT";

export type NavigationItem = {
  label: string;
  href: string;
  icon: ElementType;
  roles: Role[];
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
      roles: ["ADMIN", "DM", "PERMANENT"],
    },
  ],

  exploitation: [
    {
      label: "Consignes",
      href: "/consignes",
      icon: ClipboardList,
      roles: ["ADMIN", "DM", "PERMANENT"],
    },
    {
      label: "Documents",
      href: "/documents",
      icon: FileText,
      roles: ["ADMIN", "DM", "PERMANENT"],
    },
    {
      label: "Sécurité",
      href: "/securite",
      icon: Shield,
      roles: ["ADMIN", "DM"],
    },
    {
      label: "Maintenance",
      href: "/maintenance",
      icon: Wrench,
      roles: ["ADMIN", "DM", "PERMANENT"],
    },
    {
      label: "Planning",
      href: "/planning",
      icon: CalendarDays,
      roles: ["ADMIN", "DM"],
    },
    {
      label: "Équipements",
      href: "/equipements",
      icon: Package,
      roles: ["ADMIN", "DM", "PERMANENT"],
    },
    {
      label: "Liste équipements",
      href: "/equipements/liste",
      icon: Package,
      roles: ["ADMIN", "DM", "PERMANENT"],
    },
    {
      label: "Plans",
      href: "/plans",
      icon: Map,
      roles: ["ADMIN", "DM", "PERMANENT"],
    },
  ],

  administration: [
    {
      label: "Centre admin",
      href: "/admin",
      icon: Settings,
      roles: ["ADMIN"],
    },
    {
      label: "Utilisateurs",
      href: "/admin/utilisateurs",
      icon: Users,
      roles: ["ADMIN"],
    },
    {
      label: "Rôles",
      href: "/admin/roles",
      icon: BadgeCheck,
      roles: ["ADMIN"],
    },
    {
      label: "Secteurs",
      href: "/admin/secteurs",
      icon: Store,
      roles: ["ADMIN"],
    },
    {
      label: "Prestataires",
      href: "/admin/prestataires",
      icon: Building2,
      roles: ["ADMIN", "DM"],
    },
    {
      label: "Paramètres",
      href: "/admin/parametres",
      icon: Settings,
      roles: ["ADMIN"],
    },
    {
      label: "Journal système",
      href: "/admin/journal",
      icon: ScrollText,
      roles: ["ADMIN"],
    },
  ],
};