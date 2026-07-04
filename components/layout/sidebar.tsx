"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type MenuItem = {
  label: string;
  href: string;
  icon: string;
};

const exploitationItems: MenuItem[] = [
  { label: "Consignes", href: "/consignes", icon: "📋" },
  { label: "Documents", href: "/documents", icon: "📄" },
  { label: "Sécurité", href: "/securite", icon: "🛡️" },
  { label: "Maintenance", href: "/maintenance", icon: "🛠️" },
  { label: "Planning", href: "/planning", icon: "📅" },
];

const adminItems: MenuItem[] = [
  { label: "Centre admin", href: "/admin", icon: "⚙️" },
  { label: "Utilisateurs", href: "/admin/utilisateurs", icon: "👥" },
  { label: "Rôles", href: "/admin/roles", icon: "🛡️" },
  { label: "Secteurs", href: "/admin/secteurs", icon: "🏬" },
  { label: "Prestataires", href: "/admin/prestataires", icon: "🏢" },
  { label: "Paramètres", href: "/admin/parametres", icon: "⚙️" },
  { label: "Journal système", href: "/admin/journal", icon: "📜" },
];

function SidebarLink({ item }: { item: MenuItem }) {
  const pathname = usePathname();
  const active = pathname === item.href;

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
        active
          ? "bg-white text-[#0078b8] font-bold shadow"
          : "text-white hover:bg-white/15"
      }`}
    >
      <span>{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  );
}

function SidebarSection({
  title,
  items,
  defaultOpen,
}: {
  title: string;
  items: MenuItem[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-blue-50 hover:bg-white/10"
      >
        <span>{title}</span>
        <span>{open ? "▼" : "▶"}</span>
      </button>

      {open && (
        <div className="mt-2 ml-3 space-y-1 border-l border-white/20 pl-3">
          {items.map((item) => (
            <SidebarLink key={item.href} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  const exploitationOpen = exploitationItems.some((i) => pathname === i.href);
  const adminOpen = pathname.startsWith("/admin");

  return (
    <aside className="w-72 min-h-screen bg-[#0078b8] text-white p-6 flex flex-col">
      <div className="mb-8">
        <img
          src="/logo.png"
          alt="Castorama"
          className="w-48 mb-4 rounded-lg"
        />

        <h1 className="text-xl font-bold leading-tight">CastoManager</h1>

        <p className="text-sm text-blue-100">Castorama Claye-Souilly</p>
      </div>

      <nav className="flex-1 space-y-5">
        <SidebarLink
          item={{
            label: "Tableau de bord",
            href: "/dashboard",
            icon: "🏠",
          }}
        />

        <SidebarSection
          title="Exploitation"
          items={exploitationItems}
          defaultOpen={exploitationOpen}
        />

        <SidebarSection
          title="Administration"
          items={adminItems}
          defaultOpen={adminOpen}
        />
      </nav>

      <div className="mt-6 rounded-2xl bg-white/10 p-4">
        <p className="text-sm font-bold">Flavien Ruhaut</p>
        <p className="text-xs text-blue-100">Responsable sécurité</p>
        <p className="mt-2 text-xs text-green-200">● Connecté</p>
      </div>
    </aside>
  );
}