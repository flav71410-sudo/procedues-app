"use client";

import StatCard from "@/components/ui/stat-card";

type Props = {
  total: number;
  favoris: number;
  pdf: number;
  categories: number;
};

export default function DocumentStats({
  total,
  favoris,
  pdf,
  categories,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
      <StatCard title="Documents" value={total} icon="📄" />
      <StatCard title="Favoris" value={favoris} icon="⭐" color="#F58220" />
      <StatCard title="PDF" value={pdf} icon="📕" color="#DC2626" />
      <StatCard title="Catégories" value={categories} icon="📁" color="#16A34A" />
    </div>
  );
}