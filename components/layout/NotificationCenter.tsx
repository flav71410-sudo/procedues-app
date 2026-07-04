"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Notification = {
  id: string;
  titre: string;
  message: string;
  type: string;
  lu: boolean;
  lien: string | null;
  created_at: string;
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  async function chargerNotifications() {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error) {
      setNotifications(data || []);
    }
  }

  async function marquerCommeLue(id: string) {
    await supabase
      .from("notifications")
      .update({ lu: true })
      .eq("id", id);

    chargerNotifications();
  }

  async function toutMarquerLu() {
    await supabase
      .from("notifications")
      .update({ lu: true })
      .eq("lu", false);

    chargerNotifications();
  }

  useEffect(() => {
    chargerNotifications();
  }, []);

  const nonLues = notifications.filter((n) => !n.lu).length;

  function couleurType(type: string) {
    if (type === "danger") return "bg-red-100 text-red-700";
    if (type === "warning") return "bg-orange-100 text-orange-700";
    if (type === "success") return "bg-green-100 text-green-700";
    return "bg-blue-100 text-blue-700";
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-xl bg-white px-4 py-3 shadow hover:bg-gray-50"
      >
        🔔

        {nonLues > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
            {nonLues}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-96 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="font-bold text-gray-900">Notifications</h2>
              <p className="text-xs text-gray-500">
                {nonLues} non lue(s)
              </p>
            </div>

            <button
              onClick={toutMarquerLu}
              className="text-xs font-semibold text-[#0078b8] hover:underline"
            >
              Tout marquer lu
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`border-b p-4 ${
                  notification.lu ? "bg-white" : "bg-blue-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${couleurType(
                        notification.type
                      )}`}
                    >
                      {notification.type}
                    </span>

                    <h3 className="mt-2 font-bold text-gray-900">
                      {notification.titre}
                    </h3>

                    <p className="mt-1 text-sm text-gray-600">
                      {notification.message}
                    </p>

                    <p className="mt-2 text-xs text-gray-400">
                      {new Date(notification.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>

                  {!notification.lu && (
                    <button
                      onClick={() => marquerCommeLue(notification.id)}
                      className="text-xs text-[#0078b8] hover:underline"
                    >
                      Lu
                    </button>
                  )}
                </div>

                {notification.lien && (
                  <Link
                    href={notification.lien}
                    onClick={() => marquerCommeLue(notification.id)}
                    className="mt-3 inline-block text-sm font-semibold text-[#0078b8] hover:underline"
                  >
                    Ouvrir
                  </Link>
                )}
              </div>
            ))}

            {notifications.length === 0 && (
              <div className="p-6 text-center text-sm text-gray-500">
                Aucune notification.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}