"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  Clipboard,
  Clock3,
  Download,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Store,
  Trash2,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useAuth } from "@/providers/AuthProvider";
import { useDialog } from "@/providers/DialogProvider";
import {
  activationKeyStatus,
  deleteActivationKey,
  disableActivationKey,
  enableActivationKey,
  generateActivationKey,
  getActivationKeyRoles,
  getActivationKeys,
  getActivationKeyStores,
  type ActivationKey,
  type ActivationKeyRole,
  type ActivationKeyStore,
} from "@/services/clesActivationService";

function formatDate(value: string | null): string {
  if (!value) {
    return "Sans expiration";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date invalide";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function errorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (error as { message: unknown }).message
    );
  }

  return "Une erreur inconnue est survenue.";
}


type GeneratedKeyInfo = {
  code: string;
  roleName: string;
  storeName: string;
  expiration: string | null;
};

function pdfEscape(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function downloadActivationKeyPdf(
  info: GeneratedKeyInfo
): void {
  const expirationLabel = info.expiration
    ? formatDate(info.expiration)
    : "Sans expiration";

  const lines = [
    "CLE D'ACTIVATION",
    "",
    `Magasin : ${info.storeName}`,
    `Role : ${info.roleName}`,
    `Expiration : ${expirationLabel}`,
    "",
    "Code :",
    info.code,
    "",
    "Cette cle est personnelle et utilisable une seule fois.",
    "Apres utilisation, elle devient automatiquement invalide.",
  ].map(pdfEscape);

  const content = lines
    .map((line, index) => {
      const y = 760 - index * 28;
      const size =
        index === 0
          ? 20
          : index === 7
            ? 18
            : 11;

      return `BT /F1 ${size} Tf 60 ${y} Td (${line}) Tj ET`;
    })
    .join("\n");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj",
    `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }

  const xrefOffset = pdf.length;

  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], {
    type: "application/pdf",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `cle-activation-${info.code}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export default function ActivationKeysPage() {
  const dialog = useDialog();
  const { role, loading: authLoading } =
    useAuth();

  const [keys, setKeys] =
    useState<ActivationKey[]>([]);

  const [roles, setRoles] =
    useState<ActivationKeyRole[]>([]);

  const [stores, setStores] =
    useState<ActivationKeyStore[]>([]);

  const [roleId, setRoleId] =
    useState("");

  const [storeId, setStoreId] =
    useState("");

  const [expiration, setExpiration] =
    useState("");

  const [generatedInfo, setGeneratedInfo] =
    useState<GeneratedKeyInfo | null>(null);

  const [copied, setCopied] =
    useState(false);

  const [downloaded, setDownloaded] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [busyId, setBusyId] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const canManage =
    role === "SUPER_ADMIN";

  const load = useCallback(async () => {
    if (authLoading || !canManage) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [keysData, rolesData, storesData] =
        await Promise.all([
          getActivationKeys(),
          getActivationKeyRoles(),
          getActivationKeyStores(),
        ]);

      setKeys(keysData);
      setRoles(rolesData);
      setStores(storesData);
    } catch (currentError) {
      setError(errorMessage(currentError));
    } finally {
      setLoading(false);
    }
  }, [authLoading, canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    return keys.reduce(
      (result, key) => {
        const status =
          activationKeyStatus(key);

        result.total += 1;
        result[status] += 1;

        return result;
      },
      {
        total: 0,
        active: 0,
        used: 0,
        expired: 0,
        disabled: 0,
      }
    );
  }, [keys]);

  async function createKey() {
    if (!roleId || !storeId) {
      setError(
        "Sélectionne un rôle et un magasin."
      );
      return;
    }

    try {
      setCreating(true);
      setError("");
      setGeneratedInfo(null);
      setCopied(false);
      setDownloaded(false);

      const key =
        await generateActivationKey({
          roleId,
          magasinId: storeId,
          expiration: expiration
            ? new Date(expiration).toISOString()
            : null,
        });

      const selectedRole =
        roles.find((item) => item.id === roleId);

      const selectedStore =
        stores.find((item) => item.id === storeId);

      const expirationIso = expiration
        ? new Date(expiration).toISOString()
        : null;

      const info: GeneratedKeyInfo = {
        code: key,
        roleName:
          selectedRole?.nom ?? "Rôle sélectionné",
        storeName:
          selectedStore?.nom ?? "Magasin sélectionné",
        expiration: expirationIso,
      };

      setGeneratedInfo(info);
      setExpiration("");

      try {
        await navigator.clipboard.writeText(key);
        setCopied(true);
      } catch {
        setCopied(false);
      }

      await load();
    } catch (currentError) {
      setError(errorMessage(currentError));
    } finally {
      setCreating(false);
    }
  }

  async function copyGeneratedKey() {
    if (!generatedInfo) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        generatedInfo.code
      );

      setCopied(true);
    } catch {
      setError(
        "Impossible de copier automatiquement la clé."
      );
    }
  }

  function downloadGeneratedKey() {
    if (!generatedInfo) {
      return;
    }

    downloadActivationKeyPdf(
      generatedInfo
    );

    setDownloaded(true);
  }

  async function closeGeneratedKey() {
    if (!generatedInfo) {
      return;
    }

    if (!copied && !downloaded) {
      const confirmed = await dialog.confirm({
        title: "Fermer cette clé ?",
        description:
          "Cette clé ne pourra plus être affichée. Vérifie que tu l’as copiée ou téléchargée avant de fermer définitivement cette fenêtre.",
        confirmLabel: "Fermer quand même",
        cancelLabel: "Annuler",
        variant: "warning",
      });

      if (!confirmed) {
        return;
      }
    }

    setGeneratedInfo(null);
    setCopied(false);
    setDownloaded(false);
  }

  async function disableKey(
    key: ActivationKey
  ) {
    const confirmed = await dialog.confirm({
      title: "Désactiver cette clé ?",
      description:
        "Cette clé d’activation ne pourra plus être utilisée tant qu’elle n’aura pas été réactivée.",
      confirmLabel: "Désactiver",
      cancelLabel: "Annuler",
      variant: "warning",
    });

    if (!confirmed) {
      return;
    }

    try {
      setBusyId(key.id);
      setError("");

      await disableActivationKey(
        key.id
      );

      await load();
    } catch (currentError) {
      setError(errorMessage(currentError));
    } finally {
      setBusyId(null);
    }
  }

  async function enableKey(
    key: ActivationKey
  ) {
    try {
      setBusyId(key.id);
      setError("");

      await enableActivationKey(
        key.id
      );

      await load();
    } catch (currentError) {
      setError(errorMessage(currentError));
    } finally {
      setBusyId(null);
    }
  }

  async function removeKey(
    key: ActivationKey
  ) {
    const confirmed = await dialog.delete({
      title: "Supprimer cette clé d’activation ?",
      itemName: key.role?.nom ?? "Clé non utilisée",
      description:
        "Cette clé non utilisée sera définitivement supprimée et ne pourra plus servir à créer un compte.",
    });

    if (!confirmed) {
      return;
    }

    try {
      setBusyId(key.id);
      setError("");

      await deleteActivationKey(
        key.id
      );

      await load();
    } catch (currentError) {
      setError(errorMessage(currentError));
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[480px] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
        </div>
      </AppShell>
    );
  }

  if (!canManage) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          <h1 className="text-xl font-bold">
            Accès refusé
          </h1>

          <p className="mt-2">
            Cette page est réservée au Super Administrateur.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <KeyRound className="h-7 w-7" />
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Administration
              </p>

              <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
                Clés d’activation
              </h1>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Génération et suivi des clés à usage unique pour les comptes privilégiés.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw
              className={`h-5 w-5 ${
                loading ? "animate-spin" : ""
              }`}
            />
            Actualiser
          </button>
        </header>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Stat
            label="Total"
            value={stats.total}
            icon={<KeyRound className="h-5 w-5" />}
          />
          <Stat
            label="Actives"
            value={stats.active}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <Stat
            label="Utilisées"
            value={stats.used}
            icon={<UserRound className="h-5 w-5" />}
          />
          <Stat
            label="Expirées"
            value={stats.expired}
            icon={<Clock3 className="h-5 w-5" />}
          />
          <Stat
            label="Désactivées"
            value={stats.disabled}
            icon={<Ban className="h-5 w-5" />}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Plus className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Générer une nouvelle clé
              </h2>

              <p className="text-sm text-slate-500">
                Format : 7QFH-X92L-KM8P-R4ZT
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Rôle
              </span>

              <select
                value={roleId}
                onChange={(event) =>
                  setRoleId(event.target.value)
                }
                className={fieldClass()}
              >
                <option value="">
                  Sélectionner un rôle
                </option>

                {roles.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.nom}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Magasin
              </span>

              <select
                value={storeId}
                onChange={(event) =>
                  setStoreId(event.target.value)
                }
                className={fieldClass()}
              >
                <option value="">
                  Sélectionner un magasin
                </option>

                {stores.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.nom}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Expiration facultative
              </span>

              <input
                type="datetime-local"
                value={expiration}
                onChange={(event) =>
                  setExpiration(
                    event.target.value
                  )
                }
                className={fieldClass()}
              />
            </label>

            <button
              type="button"
              onClick={() => void createKey()}
              disabled={creating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {creating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <KeyRound className="h-5 w-5" />
              )}
              Générer
            </button>
          </div>

        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Historique des clés
            </h2>

            <p className="text-sm text-slate-500">
              Le code complet n’est pas stocké et ne peut pas être réaffiché.
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-60 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
            </div>
          ) : keys.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-950">
              <KeyRound className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-800 dark:text-slate-200">
                Aucune clé générée
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {keys.map((key) => (
                <ActivationKeyCard
                  key={key.id}
                  item={key}
                  busy={busyId === key.id}
                  onDisable={disableKey}
                  onEnable={enableKey}
                  onDelete={removeKey}
                />
              ))}
            </div>
          )}
        </section>

        {generatedInfo && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="activation-key-title"
          >
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-950">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6 dark:border-slate-800">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <KeyRound className="h-7 w-7" />
                  </div>

                  <div>
                    <h2
                      id="activation-key-title"
                      className="text-2xl font-black text-slate-900 dark:text-white"
                    >
                      Clé d’activation générée
                    </h2>

                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Cette clé ne sera plus jamais affichée après la fermeture de cette fenêtre.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void closeGeneratedKey()}
                  aria-label="Fermer"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 p-6">
                <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/30">
                  <p className="text-center text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                    Utilisable une seule fois
                  </p>

                  <code className="mt-3 block select-all rounded-xl bg-white px-4 py-5 text-center font-mono text-xl font-black tracking-widest text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white sm:text-2xl">
                    {generatedInfo.code}
                  </code>

                  {copied && (
                    <p className="mt-3 text-center text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      Clé copiée dans le presse-papiers.
                    </p>
                  )}
                </div>

                <div className="grid gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:grid-cols-3">
                  <Info
                    icon={<Store className="h-4 w-4" />}
                    label="Magasin"
                    value={generatedInfo.storeName}
                  />

                  <Info
                    icon={<UserRound className="h-4 w-4" />}
                    label="Rôle"
                    value={generatedInfo.roleName}
                  />

                  <Info
                    icon={<Clock3 className="h-4 w-4" />}
                    label="Expiration"
                    value={formatDate(generatedInfo.expiration)}
                  />
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  Pense à transmettre la clé à la bonne personne avant de fermer cette fenêtre. Une fois fermée, elle ne pourra pas être récupérée.
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 p-6 dark:border-slate-800 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => void copyGeneratedKey()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700"
                >
                  {copied ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Clipboard className="h-5 w-5" />
                  )}
                  {copied ? "Copiée" : "Copier"}
                </button>

                <button
                  type="button"
                  onClick={downloadGeneratedKey}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700"
                >
                  <Download className="h-5 w-5" />
                  Télécharger le PDF
                </button>

                <button
                  type="button"
                  onClick={() => void closeGeneratedKey()}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </AppShell>
  );
}

function ActivationKeyCard({
  item,
  busy,
  onDisable,
  onEnable,
  onDelete,
}: {
  item: ActivationKey;
  busy: boolean;
  onDisable: (
    key: ActivationKey
  ) => Promise<void>;
  onEnable: (
    key: ActivationKey
  ) => Promise<void>;
  onDelete: (
    key: ActivationKey
  ) => Promise<void>;
}) {
  const status =
    activationKeyStatus(item);

  const userName = item.utilisateur
    ? [
        item.utilisateur.prenom,
        item.utilisateur.nom,
      ]
        .filter(Boolean)
        .join(" ") ||
      item.utilisateur.email ||
      "Utilisateur inconnu"
    : null;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          <ShieldCheck className="h-6 w-6" />
        </div>

        <StatusBadge status={status} />
      </div>

      <div className="mt-4 space-y-3">
        <Info
          icon={<UserRound className="h-4 w-4" />}
          label="Rôle"
          value={item.role?.nom ?? "Rôle inconnu"}
        />

        <Info
          icon={<Store className="h-4 w-4" />}
          label="Magasin"
          value={
            item.magasin?.nom ??
            "Magasin inconnu"
          }
        />

        <Info
          icon={<Clock3 className="h-4 w-4" />}
          label="Créée le"
          value={formatDate(item.created_at)}
        />

        <Info
          icon={<Clock3 className="h-4 w-4" />}
          label="Expiration"
          value={formatDate(item.date_expiration)}
        />

        {item.utilisee && (
          <>
            <Info
              icon={<UserRound className="h-4 w-4" />}
              label="Utilisée par"
              value={
                userName ??
                "Utilisateur inconnu"
              }
            />

            <Info
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Utilisée le"
              value={formatDate(item.utilisee_at)}
            />
          </>
        )}
      </div>

      {!item.utilisee && (
        <div className="mt-5 flex flex-wrap gap-2">
          {status === "disabled" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void onEnable(item)
              }
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 font-semibold text-white disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Réactiver
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void onDisable(item)
              }
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-3 py-2 font-semibold text-white disabled:opacity-50"
            >
              <Ban className="h-4 w-4" />
              Désactiver
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void onDelete(item)
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2 font-semibold text-white disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Supprimer
          </button>
        </div>
      )}
    </article>
  );
}

function StatusBadge({
  status,
}: {
  status:
    | "active"
    | "used"
    | "expired"
    | "disabled";
}) {
  const config = {
    active: {
      label: "Active",
      icon: CheckCircle2,
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    },
    used: {
      label: "Utilisée",
      icon: UserRound,
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    },
    expired: {
      label: "Expirée",
      icon: Clock3,
      className:
        "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    },
    disabled: {
      label: "Désactivée",
      icon: XCircle,
      className:
        "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${config.className}`}
    >
      <Icon className="h-4 w-4" />
      {config.label}
    </span>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 text-slate-400">
        {icon}
      </div>

      <div>
        <p className="text-xs text-slate-500">
          {label}
        </p>

        <p className="font-semibold text-slate-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {label}
          </p>

          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-2 text-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {icon}
        </div>
      </div>
    </article>
  );
}

function fieldClass(): string {
  return "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
}