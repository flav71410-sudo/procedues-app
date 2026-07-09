"use client";

import {
  AppButton,
  AppCard,
  AppInput,
  AppSelect,
} from "@/components/ui";

type Props = {
  recherche: string;
  categorie: string;
  vue: "cartes" | "tableau";
  categories: string[];
  setRecherche: (value: string) => void;
  setCategorie: (value: string) => void;
  setVue: (value: "cartes" | "tableau") => void;
};

export default function DocumentToolbar({
  recherche,
  categorie,
  vue,
  categories,
  setRecherche,
  setCategorie,
  setVue,
}: Props) {
  return (
    <AppCard>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AppInput
          placeholder="🔍 Rechercher un document..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />

        <AppSelect
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
          options={[
            { value: "Toutes", label: "Toutes les catégories" },
            ...categories.map((cat) => ({
              value: cat,
              label: cat,
            })),
          ]}
        />

        <AppButton
          variant={vue === "cartes" ? "primary" : "secondary"}
          onClick={() => setVue("cartes")}
        >
          Vue cartes
        </AppButton>

        <AppButton
          variant={vue === "tableau" ? "primary" : "secondary"}
          onClick={() => setVue("tableau")}
        >
          Vue tableau
        </AppButton>
      </div>
    </AppCard>
  );
}