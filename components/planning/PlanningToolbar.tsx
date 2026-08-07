"use client";

import { Search, RefreshCw, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PlanningFilters } from "@/types/planning";

type Magasin = {
  readonly id: string
  readonly nom: string
}

type Props = {
  magasinActif: Magasin | null;
  vueTousMagasins: boolean;
  magasins: readonly Magasin[]
  peutChangerMagasin: boolean;
  changerMagasin: (id: string | null) => void;

  filters: PlanningFilters;
  onFiltersChange: (filters: PlanningFilters) => void;

  onRefresh: () => void;
};

const CATEGORIES = [
  "",
  "SSI",
  "BAES",
  "RIA",
  "Extincteurs",
  "Sprinkler",
  "Désenfumage",
  "Portes coupe-feu",
  "Électricité",
  "Ascenseur",
  "Formation",
  "Commission sécurité",
  "Maintenance",
  "Autre",
];

export default function PlanningToolbar({
  magasinActif,
  vueTousMagasins,
  magasins,
  peutChangerMagasin,
  changerMagasin,
  filters,
  onFiltersChange,
  onRefresh,
}: Props) {
  const router = useRouter();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">

        <div className="relative flex-1">

          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400"/>

          <input
            value={filters.recherche ?? ""}
            onChange={(e)=>
              onFiltersChange({
                ...filters,
                recherche:e.target.value,
              })
            }
            placeholder="Rechercher..."
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 dark:border-slate-700 dark:bg-slate-950"
          />

        </div>

        <select
          value={filters.categorie ?? ""}
          onChange={(e)=>
            onFiltersChange({
              ...filters,
              categorie:e.target.value,
            })
          }
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
        >

          <option value="">
            Toutes catégories
          </option>

          {CATEGORIES
            .filter(Boolean)
            .map((cat)=>(
              <option
                key={cat}
                value={cat}
              >
                {cat}
              </option>
            ))}

        </select>

        <select
          value={filters.statut ?? "tous"}
          onChange={(e)=>
            onFiltersChange({
              ...filters,
              statut:e.target.value as any,
            })
          }
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
        >

          <option value="tous">
            Tous statuts
          </option>

          <option value="planifie">
            Planifié
          </option>

          <option value="en_cours">
            En cours
          </option>

          <option value="termine">
            Terminé
          </option>

          <option value="annule">
            Annulé
          </option>

        </select>

        {peutChangerMagasin && (

          <select
            value={
              vueTousMagasins
                ? "__ALL__"
                : magasinActif?.id ?? ""
            }
            onChange={(e)=>{

              const value=e.target.value;

              changerMagasin(
                value==="__ALL__"
                  ? null
                  : value
              );

            }}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
          >

            <option value="__ALL__">
              Tous les magasins
            </option>

            {magasins.map((m)=>(
              <option
                key={m.id}
                value={m.id}
              >
                {m.nom}
              </option>
            ))}

          </select>

        )}

        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >

          <RefreshCw className="h-5 w-5"/>

          Actualiser

        </button>

        <button
          onClick={()=>
            router.push("/planning/nouveau")
          }
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >

          <Plus className="h-5 w-5"/>

          Nouvel évènement

        </button>

      </div>

    </section>
  );

}