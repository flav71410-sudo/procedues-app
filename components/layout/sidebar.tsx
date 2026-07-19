"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

import { navigation, NavigationItem } from "@/lib/navigation";
import { useAuth } from "@/providers/AuthProvider";

type Item = NavigationItem;

function SidebarLink({ item }: { item: Item }) {
  const pathname = usePathname();
  const active = pathname === item.href;

  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
        active
          ? "bg-white text-[#0078B8] font-bold shadow dark:bg-slate-100"
          : "text-white hover:bg-white/15"
      }`}
    >
      <Icon size={18} />
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
  items: Item[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (items.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-blue-50 hover:bg-white/10"
      >
        <span>{title}</span>

        {open ? (
          <ChevronDown size={16} />
        ) : (
          <ChevronRight size={16} />
        )}
      </button>

      {open && (
        <div className="mt-2 ml-3 space-y-1 border-l border-white/20 pl-3">
          {items.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { role } = useAuth();

  if (!role) return null;

  const accueil = navigation.accueil.filter((item) =>
    item.roles.includes(role)
  );

  const exploitation = navigation.exploitation.filter((item) =>
    item.roles.includes(role)
  );

  const administration = navigation.administration.filter((item) =>
    item.roles.includes(role)
  );

  const exploitationOpen = exploitation.some(
    (item) => pathname === item.href
  );

  const adminOpen = pathname.startsWith("/admin");

  return (
    <aside className="flex min-h-screen w-72 flex-col bg-[#0078B8] p-6 text-white">
      <div className="mb-8">
        <img
          src="/logo.png"
          alt="Castorama"
          className="mb-4 w-48 rounded-lg"
        />

        <h1 className="text-xl font-bold leading-tight">
          CastoManager
        </h1>

        <p className="text-sm text-blue-100">
          Castorama Claye-Souilly
        </p>
      </div>

      <nav className="flex-1 space-y-5">
        {accueil.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
          />
        ))}

        <SidebarSection
          title="Exploitation"
          items={exploitation}
          defaultOpen={exploitationOpen}
        />

        <SidebarSection
          title="Administration"
          items={administration}
          defaultOpen={adminOpen}
        />
      </nav>

      <div className="mt-6 rounded-2xl bg-white/10 p-4">
        <p className="text-sm font-bold">
          Flavien Ruhaut
        </p>

        <p className="text-xs text-blue-100">
          {role}
        </p>

        <p className="mt-2 text-xs text-green-200">
          ● Connecté
        </p>
      </div>
    </aside>
  );
}