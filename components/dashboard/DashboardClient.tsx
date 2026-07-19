"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { RefreshCw } from "lucide-react";

import ActivityTimeline from "@/components/dashboard/ActivityTimeline";
import AlertsPanel from "@/components/dashboard/AlertsPanel";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import EquipmentCharts from "@/components/dashboard/EquipmentCharts";
import HealthScoreCard from "@/components/dashboard/HealthScoreCard";
import QuickActions from "@/components/dashboard/QuickActions";
import StatsCards from "@/components/dashboard/StatsCards";
import TodayPanel from "@/components/dashboard/TodayPanel";
import { AppButton } from "@/components/ui";
import SupervisionCenter from "@/components/dashboard/SupervisionCenter";

import {
  DashboardData,
  getDashboardData,
} from "@/services/dashboard/dashboardService";

export default function DashboardClient() {
  const [dashboardData, setDashboardData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const chargerDashboard = useCallback(
    async (manualRefresh = false) => {
      if (manualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const data = await getDashboardData();
        setDashboardData(data);
      } catch (dashboardError) {
        console.error(
          "Erreur lors du chargement du dashboard :",
          dashboardError
        );

        setError(
          dashboardError instanceof Error
            ? dashboardError.message
            : "Impossible de charger les données du dashboard."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void chargerDashboard();
  }, [chargerDashboard]);

  return (
    <main className="space-y-6">
      <DashboardHeader />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white">
            Vue générale
          </h2>

          <p className="text-sm text-gray-500 dark:text-slate-400">
            Données mises à jour depuis Supabase
          </p>
        </div>

        <AppButton
          variant="secondary"
          loading={refreshing}
          disabled={loading || refreshing}
          onClick={() =>
            void chargerDashboard(true)
          }
        >
          <RefreshCw size={17} />
          Actualiser
        </AppButton>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-950/20 dark:text-red-300">
          <p className="font-bold">
            Impossible de charger certaines données
          </p>

          <p className="mt-1">{error}</p>
        </div>
      )}

      <HealthScoreCard
        healthScore={
          dashboardData?.healthScore ?? null
        }
        loading={loading}
      />

      <SupervisionCenter
  supervision={
    dashboardData?.supervision ?? null
  }
  loading={loading}
/>

      <StatsCards
        stats={dashboardData?.stats ?? null}
        loading={loading}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <AlertsPanel
          alertes={dashboardData?.alertes ?? []}
          loading={loading}
        />

        <TodayPanel />
      </div>

      <EquipmentCharts
        equipementsParType={
          dashboardData?.equipementsParType ?? []
        }
        equipementsParEtat={
          dashboardData?.equipementsParEtat ?? []
        }
        loading={loading}
      />

      <ActivityTimeline />

      <QuickActions />
    </main>
  );
}