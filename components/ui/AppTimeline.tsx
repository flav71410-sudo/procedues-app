"use client";

import { ReactNode } from "react";
import {
  CirclePlus,
  Edit,
  Trash2,
  Camera,
  FileText,
  Wrench,
  CheckCircle,
  Clock,
} from "lucide-react";

type Variant =
  | "creation"
  | "modification"
  | "suppression"
  | "photo"
  | "document"
  | "intervention"
  | "verification"
  | "default";

export type TimelineItem = {
  id: string;
  title: string;
  description?: string | null;
  user?: string | null;
  date: string;
  variant?: Variant;
  icon?: ReactNode;
};

type Props = {
  items: TimelineItem[];
  emptyText?: string;
};

export default function AppTimeline({
  items,
  emptyText = "Aucun historique.",
}: Props) {
  const variants = {
    creation: {
      icon: <CirclePlus size={18} />,
      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    modification: {
      icon: <Edit size={18} />,
      color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    },
    suppression: {
      icon: <Trash2 size={18} />,
      color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    },
    photo: {
      icon: <Camera size={18} />,
      color: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
    },
    document: {
      icon: <FileText size={18} />,
      color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
    },
    intervention: {
      icon: <Wrench size={18} />,
      color: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
    },
    verification: {
      icon: <CheckCircle size={18} />,
      color: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
    },
    default: {
      icon: <Clock size={18} />,
      color: "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300",
    },
  };

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-slate-700 dark:text-slate-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      <div className="absolute left-5 top-2 h-full w-px bg-gray-200 dark:bg-slate-800" />

      {items.map((item) => {
        const current = variants[item.variant || "default"];

        return (
          <div key={item.id} className="relative flex gap-4">
            <div
              className={`z-10 flex h-10 w-10 items-center justify-center rounded-full ${current.color}`}
            >
              {item.icon || current.icon}
            </div>

            <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                      {item.description}
                    </p>
                  )}

                  {item.user && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-slate-500">
                      Par {item.user}
                    </p>
                  )}
                </div>

                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {new Date(item.date).toLocaleString("fr-FR")}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}