"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AppCard, AppTimeline, TimelineItem } from "@/components/ui";

type Props = {
  equipementId: string;
};

export default function EquipmentHistory({ equipementId }: Props) {
  const [items, setItems] = useState<TimelineItem[]>([]);

  async function chargerHistorique() {
    const { data } = await supabase
      .from("historique")
      .select("*")
      .eq("objet_id", equipementId)
      .order("created_at", { ascending: false });

    setItems(
      (data || []).map((item) => ({
        id: item.id,
        title: item.action,
        description: item.description,
        user: item.utilisateur,
        date: item.created_at,
        variant: "default",
      }))
    );
  }

  useEffect(() => {
    chargerHistorique();
  }, []);

  return (
    <AppCard title="Historique">
      <AppTimeline
        items={items}
        emptyText="Aucun historique pour cet équipement."
      />
    </AppCard>
  );
}