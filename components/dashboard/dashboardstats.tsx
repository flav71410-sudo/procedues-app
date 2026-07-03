"use client";
import StatCard from "@/components/ui/StatCard";

type Props = {
  totalConsignes: number;
  critiques: number;
  hautes: number;
  fichiers: number;
  utilisateurs: number;
  activites: number;
};

export default function DashboardStats({
  totalConsignes,
  critiques,
  hautes,
  fichiers,
  utilisateurs,
  activites,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-6 mt-8">
      <StatCard title="Consignes" value={totalConsignes} icon="📋" />
      <StatCard title="Critiques" value={critiques} color="#DC2626" icon="🚨" />
      <StatCard title="Priorité haute" value={hautes} color="#F58220" icon="⚠️" />
      <StatCard title="Fichiers" value={fichiers} icon="📎" />
      <StatCard title="Utilisateurs" value={utilisateurs} color="#16A34A" icon="👥" />
      <StatCard title="Activités" value={activites} color="#6B7280" icon="📜" />
    </div>
  );
}