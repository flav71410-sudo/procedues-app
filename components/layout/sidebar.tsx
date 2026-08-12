"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  navigation,
  type NavigationItem,
} from "@/lib/navigation";
import { useAuth } from "@/providers/AuthProvider";

type SidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

type SidebarLinkProps = {
  item: NavigationItem;
  onNavigate?: () => void;
};

type SidebarSectionProps = {
  title: string;
  items: NavigationItem[];
  defaultOpen: boolean;
  onNavigate?: () => void;
};

const MODULE_PAR_ROUTE: Record<string, string> = {
  "/dashboard": "dashboard",
  "/analytics": "analytics",
  "/consignes": "consignes",
  "/documents": "documents",
  "/maintenance": "maintenance",
  "/investissements": "investissements",
  "/planning": "planning",
  "/equipements": "equipements",
  "/plans": "plans",
  "/securite": "securite",
};

function moduleAutorise(
  href: string,
  modules: string[] | null
): boolean {
  if (!modules) {
    return true;
  }

  const entree = Object.entries(
    MODULE_PAR_ROUTE
  ).find(
    ([route]) =>
      href === route ||
      href.startsWith(`${route}/`)
  );

  if (!entree) {
    return true;
  }

  return modules.includes(entree[1]);
}

function SidebarLink({
  item,
  onNavigate,
}: SidebarLinkProps) {
  const pathname = usePathname();

  const active =
    pathname === item.href ||
    (item.href !== "/dashboard" &&
      pathname.startsWith(`${item.href}/`));

  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={[
        "flex min-h-12 items-center gap-3 rounded-xl px-4 py-3",
        "text-sm transition duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
        active
          ? "bg-white font-bold text-[#0078B8] shadow dark:bg-slate-100"
          : "text-white hover:bg-white/15 active:bg-white/20",
      ].join(" ")}
    >
      <Icon size={19} className="shrink-0" />
      <span className="min-w-0 truncate">
        {item.label}
      </span>
    </Link>
  );
}

function SidebarSection({
  title,
  items,
  defaultOpen,
  onNavigate,
}: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (defaultOpen) {
      setOpen(true);
    }
  }, [defaultOpen]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={[
          "flex min-h-12 w-full items-center justify-between",
          "rounded-xl px-4 py-3 text-sm font-bold text-blue-50",
          "transition hover:bg-white/10 active:bg-white/15",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
        ].join(" ")}
      >
        <span>{title}</span>

        {open ? (
          <ChevronDown size={17} className="shrink-0" />
        ) : (
          <ChevronRight size={17} className="shrink-0" />
        )}
      </button>

      <div
        className={[
          "grid transition-all duration-200",
          open
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="ml-3 mt-2 space-y-1 border-l border-white/20 pl-3">
            {items.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({
  onMobileClose,
}: {
  onMobileClose?: () => void;
}) {
  const pathname = usePathname();
  const {
    can,
    loading,
    role,
    magasin,
  } = useAuth();

  const modulesAutorises =
    magasin?.modulesAutorises ?? null;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
      </div>
    );
  }

  const estCollaborateur = role === "COLLABORATEUR";
  const estPermanent = role === "PERMANENT";
  const estSuperAdmin = role === "SUPER_ADMIN";

const accueil = navigation.accueil.filter((item) => {
  if (!can(item.permission)) {
    return false;
  }

  if (
    !estSuperAdmin &&
    !moduleAutorise(
      item.href,
      modulesAutorises
    )
  ) {
    return false;
  }

  // Un collaborateur nouvellement inscrit ne voit
  // que le tableau de bord et son profil.
  if (estCollaborateur) {
    return (
      item.href === "/dashboard" ||
      item.href === "/profil"
    );
  }

  // Le Permanent ne voit pas Analytics.
  if (estPermanent && item.href === "/analytics") {
    return false;
  }

  return true;
});

const exploitation = estCollaborateur
  ? []
  : navigation.exploitation.filter((item) => {
      if (!can(item.permission)) {
        return false;
      }

      if (
        !estSuperAdmin &&
        !moduleAutorise(
          item.href,
          modulesAutorises
        )
      ) {
        return false;
      }

      return true;
    });

const administration = estCollaborateur
  ? []
  : navigation.administration.filter((item) => {
      if (!can(item.permission)) {
        return false;
      }

      if (
        !estSuperAdmin &&
        !moduleAutorise(
          item.href,
          modulesAutorises
        )
      ) {
        return false;
      }

      // Pages strictement réservées au Super administrateur
      if (
        item.href === "/administration/magasins" ||
        item.href === "/administration/cles-activation"
      ) {
        return estSuperAdmin;
      }

      return true;
    });

  const exploitationOpen = exploitation.some(
    (item) =>
      pathname === item.href ||
      pathname.startsWith(`${item.href}/`)
  );

  const adminOpen = pathname.startsWith("/admin");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-4 pt-5 lg:px-6 lg:pt-6">
        <div className="min-w-0">
          <img
  src="/secumanager-logo.png"
  alt="SécuManager"
  className="mb-4 h-auto w-52 max-w-full rounded-xl object-contain lg:w-56"
/>

<h1 className="truncate text-xl font-bold leading-tight">
  SécuManager
</h1>

          <p className="mt-1 truncate text-sm text-blue-100">
            {magasin?.nom ??
              (role === "SUPER_ADMIN"
                ? "Tous les magasins"
                : "Magasin non attribué")}
          </p>
        </div>

        <button
          type="button"
          onClick={onMobileClose}
          aria-label="Fermer le menu"
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center",
            "rounded-xl bg-white/10 transition",
            "hover:bg-white/20 active:bg-white/25",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
            "lg:hidden",
          ].join(" ")}
        >
          <X size={23} />
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 lg:px-6">
        <div className="space-y-1">
          {accueil.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              onNavigate={onMobileClose}
            />
          ))}
        </div>

        <SidebarSection
          title="Exploitation"
          items={exploitation}
          defaultOpen={exploitationOpen}
          onNavigate={onMobileClose}
        />

        <SidebarSection
          title="Administration"
          items={administration}
          defaultOpen={adminOpen}
          onNavigate={onMobileClose}
        />
      </nav>

    </div>
  );
}

export default function Sidebar({
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 bg-[#0078B8] text-white lg:block">
        <SidebarContent />
      </aside>

      <button
        type="button"
        aria-label="Fermer le menu"
        onClick={onMobileClose}
        className={[
          "fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]",
          "transition-opacity duration-300 lg:hidden",
          mobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      <aside
        aria-hidden={!mobileOpen}
        className={[
          "fixed inset-y-0 left-0 z-50 w-[86vw] max-w-80",
          "bg-[#0078B8] text-white shadow-2xl",
          "transition-transform duration-300 ease-out lg:hidden",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full",
        ].join(" ")}
      >
        <SidebarContent onMobileClose={onMobileClose} />
      </aside>
    </>
  );
}