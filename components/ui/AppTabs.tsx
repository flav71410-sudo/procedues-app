"use client";

type Tab = {
  id: string;
  label: string;
};

type Props = {
  tabs: Tab[];
  activeTab: string;
  onChange: (tab: string) => void;
};

export default function AppTabs({ tabs, activeTab, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-[#0078B8] text-white shadow"
                : "text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}