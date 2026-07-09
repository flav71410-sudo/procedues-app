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

export const navigation = {
  accueil: [
    {
      label: "Tableau de bord",
      href: "/dashboard",
      icon: Home,
    },
  ],

  exploitation: [
    {
      label: "Consignes",
      href: "/consignes",
      icon: ClipboardList,
    },
    {
      label: "Documents",
      href: "/documents",
      icon: FileText,
    },
    {
      label: "Sécurité",
      href: "/securite",
      icon: Shield,
    },
    {
      label: "Maintenance",
      href: "/maintenance",
      icon: Wrench,
    },
    {
      label: "Planning",
      href: "/planning",
      icon: CalendarDays,
    },
    {
  label: "Équipements",
  href: "/equipements",
  icon: Package,
},
{
  label: "Liste équipements",
  href: "/equipements/liste",
  icon: Package,
},
{
  label: "Plans",
  href: "/plans",
  icon: Map,
},
  ],

  administration: [
    {
      label: "Centre admin",
      href: "/admin",
      icon: Settings,
    },
    {
      label: "Utilisateurs",
      href: "/admin/utilisateurs",
      icon: Users,
    },
    {
      label: "Rôles",
      href: "/admin/roles",
      icon: BadgeCheck,
    },
    {
      label: "Secteurs",
      href: "/admin/secteurs",
      icon: Store,
    },
    {
      label: "Prestataires",
      href: "/admin/prestataires",
      icon: Building2,
    },
    {
      label: "Paramètres",
      href: "/admin/parametres",
      icon: Settings,
    },
    {
      label: "Journal système",
      href: "/admin/journal",
      icon: ScrollText,
    },
  ],
};