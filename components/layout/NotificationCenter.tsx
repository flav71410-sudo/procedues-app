"use client";

import {
  Bell,
  BellRing,
  CalendarDays,
  Check,
  CheckCheck,
  CircleAlert,
  FileText,
  Info,
  Package,
  Trash2,
  TrendingUp,
  Wrench,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "@/providers/AuthProvider";
import {
  getNotifications,
  marquerNotificationCommeLue,
  marquerToutesCommeLues,
  supprimerNotification,
  supprimerToutesNotificationsLues,
  type NotificationItem,
  type NotificationScope,
  type NotificationType,
} from "@/services/notificationService";

function formatRelativeDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return "À l’instant";
  }

  if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} min`;
  }

  const diffHeures = Math.floor(diffMinutes / 60);

  if (diffHeures < 24) {
    return `Il y a ${diffHeures} h`;
  }

  const diffJours = Math.floor(diffHeures / 24);

  if (diffJours === 1) {
    return "Hier";
  }

  if (diffJours < 7) {
    return `Il y a ${diffJours} j`;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}

function getTypeIcon(type: NotificationType) {
  const className = "h-4 w-4";

  switch (type) {
    case "maintenance":
      return <Wrench className={className} />;

    case "investissement":
      return <TrendingUp className={className} />;

    case "planning":
      return <CalendarDays className={className} />;

    case "consigne":
    case "document":
      return <FileText className={className} />;

    case "equipement":
      return <Package className={className} />;

    case "systeme":
      return <CircleAlert className={className} />;

    default:
      return <Info className={className} />;
  }
}

function getTypeClasses(type: NotificationType): string {
  switch (type) {
    case "maintenance":
      return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";

    case "investissement":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";

    case "planning":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";

    case "consigne":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

    case "document":
      return "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300";

    case "equipement":
      return "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300";

    case "systeme":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";

    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
}

function getPrioriteClasses(
  priorite: NotificationItem["priorite"]
): string {
  switch (priorite) {
    case "urgente":
      return "bg-red-500";

    case "haute":
      return "bg-orange-500";

    case "basse":
      return "bg-slate-400";

    default:
      return "bg-blue-500";
  }
}

export default function NotificationCenter() {
  const {
    magasinActif,
    vueTousMagasins,
    loading: authLoading,
  } = useAuth();

  const containerRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    NotificationItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingRead, setDeletingRead] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scope = useMemo<NotificationScope>(
    () => ({
      magasinId: magasinActif?.id ?? null,
      tousMagasins: vueTousMagasins,
    }),
    [magasinActif?.id, vueTousMagasins]
  );

  const nonLues = useMemo(
    () =>
      notifications.filter(
        (notification) => !notification.lue
      ).length,
    [notifications]
  );

  const charger = useCallback(
    async (silent = false) => {
      if (authLoading) {
        return;
      }

      try {
        if (!silent) {
          setLoading(true);
        }

        setError(null);

        const data = await getNotifications(
          scope,
          50
        );

        setNotifications(data);
      } catch (currentError) {
        console.error(
          "Erreur chargement notifications :",
          currentError
        );

        setError(
          currentError instanceof Error
            ? currentError.message
            : "Impossible de charger les notifications."
        );
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [authLoading, scope]
  );

  useEffect(() => {
    void charger();
  }, [charger]);

  useEffect(() => {
    if (authLoading) return;

    const interval = window.setInterval(() => {
      void charger(true);
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [authLoading, charger]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown
    );
    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown
      );
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  async function ouvrirNotification(
    notification: NotificationItem
  ) {
    try {
      if (!notification.lue) {
        setBusyId(notification.id);

        await marquerNotificationCommeLue(
          notification.id
        );

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  lue: true,
                  date_lecture:
                    new Date().toISOString(),
                }
              : item
          )
        );
      }
    } catch (currentError) {
      console.error(
        "Erreur lecture notification :",
        currentError
      );
    } finally {
      setBusyId(null);
    }

    if (notification.lien) {
      setOpen(false);
      window.location.href = notification.lien;
    }
  }

  async function toutMarquerCommeLu() {
    if (nonLues === 0) return;

    try {
      setMarkingAll(true);
      setError(null);

      await marquerToutesCommeLues(scope);

      const maintenant =
        new Date().toISOString();

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          lue: true,
          date_lecture:
            item.date_lecture ?? maintenant,
        }))
      );
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "Impossible de marquer les notifications comme lues."
      );
    } finally {
      setMarkingAll(false);
    }
  }

  async function supprimer(
    notification: NotificationItem
  ) {
    try {
      setBusyId(notification.id);
      setError(null);

      await supprimerNotification(
        notification.id
      );

      setNotifications((current) =>
        current.filter(
          (item) =>
            item.id !== notification.id
        )
      );
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "Impossible de supprimer la notification."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function nettoyerLues() {
    const totalLues =
      notifications.filter(
        (item) => item.lue
      ).length;

    if (totalLues === 0) return;

    try {
      setDeletingRead(true);
      setError(null);

      await supprimerToutesNotificationsLues(
        scope
      );

      setNotifications((current) =>
        current.filter(
          (item) => !item.lue
        )
      );
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "Impossible de supprimer les notifications lues."
      );
    } finally {
      setDeletingRead(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        aria-label={
          nonLues > 0
            ? `${nonLues} notification${
                nonLues > 1 ? "s" : ""
              } non lue${
                nonLues > 1 ? "s" : ""
              }`
            : "Notifications"
        }
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={[
          "relative flex h-11 w-11 items-center justify-center rounded-xl",
          "text-gray-600 transition hover:bg-gray-100",
          "dark:text-slate-200 dark:hover:bg-slate-800",
          open
            ? "bg-gray-100 dark:bg-slate-800"
            : "",
        ].join(" ")}
      >
        {nonLues > 0 ? (
          <BellRing
            size={21}
            className="text-amber-500"
          />
        ) : (
          <Bell size={21} />
        )}

        {nonLues > 0 && (
          <span
            className={[
              "absolute -right-1 -top-1 flex min-h-5 min-w-5",
              "items-center justify-center rounded-full",
              "bg-red-600 px-1 text-[10px] font-black text-white",
              "ring-2 ring-white dark:ring-slate-900",
            ].join(" ")}
          >
            {nonLues > 99
              ? "99+"
              : nonLues}
          </span>
        )}
      </button>

      {open && (
        <div
          className={[
            "absolute right-0 top-14 z-[100]",
            "w-[min(420px,calc(100vw-24px))]",
            "overflow-hidden rounded-2xl",
            "border border-gray-200 bg-white shadow-2xl",
            "dark:border-slate-700 dark:bg-slate-900",
          ].join(" ")}
        >
          <div className="border-b border-gray-200 px-4 py-4 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-gray-900 dark:text-white">
                  Notifications
                </h2>

                <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                  {nonLues > 0
                    ? `${nonLues} non lue${
                        nonLues > 1 ? "s" : ""
                      }`
                    : "Tout est à jour"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  void toutMarquerCommeLu()
                }
                disabled={
                  nonLues === 0 ||
                  markingAll
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70"
              >
                <CheckCheck size={14} />
                {markingAll
                  ? "Traitement..."
                  : "Tout marquer lu"}
              </button>

              <button
                type="button"
                onClick={() =>
                  void nettoyerLues()
                }
                disabled={
                  deletingRead ||
                  !notifications.some(
                    (item) => item.lue
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Trash2 size={14} />
                {deletingRead
                  ? "Suppression..."
                  : "Effacer les lues"}
              </button>
            </div>
          </div>

          {error && (
            <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="max-h-[520px] overflow-y-auto">
            {loading ? (
              <div className="flex min-h-44 items-center justify-center px-4 py-8 text-sm text-gray-500 dark:text-slate-400">
                Chargement...
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-300">
                  <Bell size={22} />
                </div>

                <p className="mt-4 font-bold text-gray-900 dark:text-white">
                  Aucune notification
                </p>

                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  Les alertes de SécuManager apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {notifications.map(
                  (notification) => (
                    <div
                      key={notification.id}
                      className={[
                        "group relative flex gap-3 p-4 transition",
                        notification.lue
                          ? "bg-white dark:bg-slate-900"
                          : "bg-blue-50/55 dark:bg-blue-950/15",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          void ouvrirNotification(
                            notification
                          )
                        }
                        disabled={
                          busyId ===
                          notification.id
                        }
                        className="flex min-w-0 flex-1 gap-3 text-left disabled:opacity-60"
                      >
                        <div
                          className={[
                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            getTypeClasses(
                              notification.type
                            ),
                          ].join(" ")}
                        >
                          {getTypeIcon(
                            notification.type
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <span
                              className={[
                                "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                                getPrioriteClasses(
                                  notification.priorite
                                ),
                              ].join(" ")}
                              aria-hidden="true"
                            />

                            <p
                              className={[
                                "min-w-0 flex-1 text-sm text-gray-900 dark:text-white",
                                notification.lue
                                  ? "font-semibold"
                                  : "font-black",
                              ].join(" ")}
                            >
                              {notification.titre}
                            </p>

                            {!notification.lue && (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                            )}
                          </div>

                          {notification.message && (
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-slate-400">
                              {notification.message}
                            </p>
                          )}

                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500">
                              {formatRelativeDate(
                                notification.created_at
                              )}
                            </span>

                            {notification.lien && (
                              <>
                                <span className="text-gray-300 dark:text-slate-700">
                                  •
                                </span>

                                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                  Ouvrir
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void supprimer(
                            notification
                          )
                        }
                        disabled={
                          busyId ===
                          notification.id
                        }
                        aria-label="Supprimer la notification"
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 group-hover:opacity-100 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-gray-500 dark:text-slate-500">
                Actualisation automatique toutes les 30 s
              </p>

              <button
                type="button"
                onClick={() =>
                  void charger(false)
                }
                className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
              >
                Actualiser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}