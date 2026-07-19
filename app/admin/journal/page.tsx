import AppShell from "@/components/AppShell";

export default function JournalPage() {
  return (
    <AppShell>
      <main className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">
            Journal système
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            Le module Journal système sera bientôt disponible.
          </p>
        </section>
      </main>
    </AppShell>
  );
}