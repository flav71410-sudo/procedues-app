"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  Eye,
  FileText,
  History,
  Loader2,
  Pencil,
  Save,
  Trash2,
  Upload,
  Wrench,
  X,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useAuth } from "@/providers/AuthProvider";
import {
  deleteMaintenance,
  deleteMaintenanceDocument,
  downloadMaintenanceDocument,
  formatMaintenanceError,
  getMaintenance,
  getMaintenanceFormOptions,
  openMaintenanceDocument,
  updateMaintenance,
  uploadMaintenanceDocument,
  type MaintenanceDetail,
  type MaintenanceDocument,
  type MaintenanceFormOptions,
} from "@/services/maintenanceService";

type Tab = "informations" | "documents" | "historique";

type FormState = {
  titre: string;
  equipement_id: string;
  prestataire_id: string;
  type_id: string;
  priorite_id: string;
  criticite_id: string;
  statut_id: string;
  resultat_id: string;
  description: string;
  anomalies: string;
  travaux_realises: string;
  observations: string;
  date_debut: string;
  date_fin: string;
  equipement_immobilise: boolean;
  date_remise_service: string;
  technicien: string;
};

const EMPTY_OPTIONS: MaintenanceFormOptions = {
  equipements: [],
  prestataires: [],
  types: [],
  priorites: [],
  criticites: [],
  statuts: [],
  resultats: [],
};

function toLocalInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}


function formatSize(value: number | null): string {
  if (value === null) return "Taille inconnue";
  if (value < 1024) return `${value} o`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} Ko`;
  return `${(value / 1024 / 1024).toFixed(1)} Mo`;
}

function toForm(data: MaintenanceDetail): FormState {
  return {
    titre: data.titre,
    equipement_id: data.equipement_id ?? "",
    prestataire_id: data.prestataire_id ?? "",
    type_id: data.type_id,
    priorite_id: data.priorite_id,
    criticite_id: data.criticite_id,
    statut_id: data.statut_id,
    resultat_id: data.resultat_id ?? "",
    description: data.description ?? "",
    anomalies: data.anomalies ?? "",
    travaux_realises: data.travaux_realises ?? "",
    observations: data.observations ?? "",
    date_debut: toLocalInput(data.date_debut),
    date_fin: toLocalInput(data.date_fin),
    equipement_immobilise: data.equipement_immobilise,
    date_remise_service: toLocalInput(data.date_remise_service),
    technicien: data.technicien ?? "",
  };
}

export default function MaintenanceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();

  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const canEdit = can("maintenance.edit");
  const canDelete = can("maintenance.delete");
  const fileInput = useRef<HTMLInputElement | null>(null);

  const [maintenance, setMaintenance] = useState<MaintenanceDetail | null>(null);
  const [options, setOptions] =
    useState<MaintenanceFormOptions>(EMPTY_OPTIONS);
  const [form, setForm] = useState<FormState | null>(null);
  const [tab, setTab] = useState<Tab>("informations");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyDocument, setBusyDocument] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const [detail, lists] = await Promise.all([
        getMaintenance(id),
        getMaintenanceFormOptions(),
      ]);

      setMaintenance(detail);
      setOptions(lists);
      setForm(toForm(detail));
    } catch (e) {
      setError(formatMaintenanceError(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function change<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function cancelEdit() {
    if (!maintenance) return;
    setForm(toForm(maintenance));
    setEditing(false);
    setError(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!maintenance || !form) return;

    if (
      !form.titre.trim() ||
      !form.equipement_id ||
      !form.type_id ||
      !form.priorite_id ||
      !form.criticite_id ||
      !form.statut_id
    ) {
      setError(
        "Le titre, l’équipement, le type, la priorité, la criticité et le statut sont obligatoires."
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await updateMaintenance(maintenance.id, {
        titre: form.titre.trim(),
        equipement_id: form.equipement_id,
        prestataire_id: form.prestataire_id || null,
        type_id: form.type_id,
        priorite_id: form.priorite_id,
        criticite_id: form.criticite_id,
        statut_id: form.statut_id,
        resultat_id: form.resultat_id || null,
        description: form.description.trim() || null,
        anomalies: form.anomalies.trim() || null,
        travaux_realises: form.travaux_realises.trim() || null,
        observations: form.observations.trim() || null,
        date_debut: toIso(form.date_debut) ?? maintenance.date_debut,
        date_fin: toIso(form.date_fin),
        equipement_immobilise: form.equipement_immobilise,
        date_remise_service: toIso(form.date_remise_service),
        technicien: form.technicien.trim() || null,
      });

      await load();
      setEditing(false);
      setSuccess("La maintenance a été enregistrée.");
    } catch (e) {
      setError(formatMaintenanceError(e));
    } finally {
      setSaving(false);
    }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!maintenance || files.length === 0) return;

    try {
      setUploading(true);
      setError(null);

      for (const file of files) {
        await uploadMaintenanceDocument(maintenance.id, file);
      }

      await load();
      setTab("documents");
      setSuccess(
        files.length > 1
          ? `${files.length} documents ont été ajoutés.`
          : "Le document a été ajouté."
      );
    } catch (e) {
      setError(formatMaintenanceError(e));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function openDocument(document: MaintenanceDocument) {
    try {
      setBusyDocument(document.id);
      await openMaintenanceDocument(document.fichier_path);
    } catch (e) {
      setError(formatMaintenanceError(e));
    } finally {
      setBusyDocument(null);
    }
  }

  async function downloadDocument(document: MaintenanceDocument) {
    try {
      setBusyDocument(document.id);
      await downloadMaintenanceDocument(document);
    } catch (e) {
      setError(formatMaintenanceError(e));
    } finally {
      setBusyDocument(null);
    }
  }

  async function removeDocument(document: MaintenanceDocument) {
    if (
      !canDelete ||
      !window.confirm(`Supprimer "${document.nom_original}" ?`)
    ) {
      return;
    }

    try {
      setBusyDocument(document.id);
      await deleteMaintenanceDocument(document);
      await load();
      setSuccess("Le document a été supprimé.");
    } catch (e) {
      setError(formatMaintenanceError(e));
    } finally {
      setBusyDocument(null);
    }
  }

  async function removeMaintenance() {
    if (
      !maintenance ||
      !canDelete ||
      !window.confirm(
        `Supprimer définitivement ${maintenance.numero} — ${maintenance.titre} ?`
      )
    ) {
      return;
    }

    try {
      setDeleting(true);
      await deleteMaintenance(maintenance.id);
      router.push("/maintenance");
      router.refresh();
    } catch (e) {
      setError(formatMaintenanceError(e));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[420px] items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
          <Loader2 className="h-6 w-6 animate-spin" />
          Chargement de la maintenance...
        </div>
      </AppShell>
    );
  }

  if (!maintenance || !form) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          <h1 className="text-xl font-bold">Maintenance introuvable</h1>
          <p className="mt-2">
            {error ?? "Cette maintenance n’est pas accessible."}
          </p>
          <Link
            href="/maintenance"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-medium text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <Link
              href="/maintenance"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à la maintenance
            </Link>

            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <Wrench className="h-7 w-7" />
              </div>

              <div>
                <p className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {maintenance.numero}
                </p>
                <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
                  {maintenance.titre}
                </h1>
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                  {maintenance.equipement_label}
                </p>
              </div>
            </div>
          </div>

          {(canEdit || canDelete) && (
            <div className="flex flex-col gap-3 sm:flex-row">
              {canEdit &&
                (!editing ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(true);
                      setTab("informations");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                  >
                    <Pencil className="h-5 w-5" />
                    Modifier
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <X className="h-5 w-5" />
                    Annuler
                  </button>
                ))}

              {canDelete && (
                <button
                  type="button"
                  onClick={() => void removeMaintenance()}
                  disabled={deleting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Trash2 className="h-5 w-5" />
                  )}
                  Supprimer
                </button>
              )}
            </div>
          )}
        </header>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
            {success}
          </div>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Type" value={maintenance.type_label} />
          <InfoCard
            label="Prestataire"
            value={maintenance.prestataire_label ?? "Non renseigné"}
          />
          <InfoCard label="Statut" value={maintenance.statut_label} />
        </section>

        {maintenance.equipement_immobilise && (
          <div className="mt-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Équipement immobilisé</p>
              <p className="mt-1 text-sm">
                Remise en service :{" "}
                {formatDate(maintenance.date_remise_service)}
              </p>
            </div>
          </div>
        )}

        <nav className="mt-8 flex gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
          <TabButton
            active={tab === "informations"}
            onClick={() => setTab("informations")}
            icon={<FileText className="h-4 w-4" />}
          >
            Informations
          </TabButton>
          <TabButton
            active={tab === "documents"}
            onClick={() => setTab("documents")}
            icon={<Upload className="h-4 w-4" />}
          >
            Documents ({maintenance.documents.length})
          </TabButton>
          <TabButton
            active={tab === "historique"}
            onClick={() => setTab("historique")}
            icon={<History className="h-4 w-4" />}
          >
            Historique ({maintenance.historique.length})
          </TabButton>
        </nav>

        {tab === "informations" && (
          <form onSubmit={save} className="mt-6 space-y-6">
            <Panel title="Informations générales">
              <div className="grid gap-5 md:grid-cols-2">
                <TextField
                  label="Titre *"
                  value={form.titre}
                  disabled={!editing}
                  onChange={(value) => change("titre", value)}
                  className="md:col-span-2"
                />

                <SelectField
                  label="Équipement *"
                  value={form.equipement_id}
                  disabled={!editing}
                  onChange={(value) => change("equipement_id", value)}
                  options={options.equipements.map((item) => ({
                    id: item.id,
                    label: item.numero
                      ? `${item.numero} — ${item.label}`
                      : item.label,
                  }))}
                />

                <SelectField
                  label="Prestataire"
                  value={form.prestataire_id}
                  disabled={!editing}
                  onChange={(value) => change("prestataire_id", value)}
                  options={options.prestataires}
                  emptyLabel="Aucun prestataire"
                />

                <SelectField
                  label="Type *"
                  value={form.type_id}
                  disabled={!editing}
                  onChange={(value) => change("type_id", value)}
                  options={options.types}
                />

                <SelectField
                  label="Priorité *"
                  value={form.priorite_id}
                  disabled={!editing}
                  onChange={(value) => change("priorite_id", value)}
                  options={options.priorites}
                />

                <SelectField
                  label="Criticité *"
                  value={form.criticite_id}
                  disabled={!editing}
                  onChange={(value) => change("criticite_id", value)}
                  options={options.criticites}
                />

                <SelectField
                  label="Statut *"
                  value={form.statut_id}
                  disabled={!editing}
                  onChange={(value) => change("statut_id", value)}
                  options={options.statuts}
                />

                <SelectField
                  label="Résultat"
                  value={form.resultat_id}
                  disabled={!editing}
                  onChange={(value) => change("resultat_id", value)}
                  options={options.resultats}
                  emptyLabel="Aucun résultat"
                />

                <TextField
                  label="Technicien"
                  value={form.technicien}
                  disabled={!editing}
                  onChange={(value) => change("technicien", value)}
                />
              </div>
            </Panel>

            <Panel title="Dates, durée et coût">
              <div className="grid gap-5 md:grid-cols-2">
                <DateField
                  label="Début"
                  value={form.date_debut}
                  disabled={!editing}
                  onChange={(value) => change("date_debut", value)}
                />

                <DateField
                  label="Fin"
                  value={form.date_fin}
                  disabled={!editing}
                  onChange={(value) => change("date_fin", value)}
                />

                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.equipement_immobilise}
                    disabled={!editing}
                    onChange={(event) =>
                      change("equipement_immobilise", event.target.checked)
                    }
                    className="mt-1 h-4 w-4"
                  />
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    Équipement immobilisé
                  </span>
                </label>

                {form.equipement_immobilise && (
                  <DateField
                    label="Date de remise en service"
                    value={form.date_remise_service}
                    disabled={!editing}
                    onChange={(value) =>
                      change("date_remise_service", value)
                    }
                    className="md:col-span-2"
                  />
                )}
              </div>
            </Panel>

            <Panel title="Compte rendu">
              <div className="space-y-5">
                <TextAreaField
                  label="Description"
                  value={form.description}
                  disabled={!editing}
                  onChange={(value) => change("description", value)}
                />
                <TextAreaField
                  label="Anomalies constatées"
                  value={form.anomalies}
                  disabled={!editing}
                  onChange={(value) => change("anomalies", value)}
                />
                <TextAreaField
                  label="Travaux réalisés"
                  value={form.travaux_realises}
                  disabled={!editing}
                  onChange={(value) => change("travaux_realises", value)}
                />
                <TextAreaField
                  label="Observations"
                  value={form.observations}
                  disabled={!editing}
                  onChange={(value) => change("observations", value)}
                />
              </div>
            </Panel>

            {editing && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="h-5 w-5" />
                  )}
                  Enregistrer
                </button>
              </div>
            )}
          </form>
        )}

        {tab === "documents" && (
          <Panel title="Documents" className="mt-6">
            <div className="flex justify-end">
              {canEdit && (
                <>
                  <input
                    ref={fileInput}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(event) => void upload(event)}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInput.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                    Ajouter
                  </button>
                </>
              )}
            </div>

            {maintenance.documents.length === 0 ? (
              <p className="mt-6 rounded-xl border-2 border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700">
                Aucun document.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {maintenance.documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {document.nom_original}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatSize(document.taille)} ·{" "}
                        {formatDate(document.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        onClick={() => void openDocument(document)}
                        disabled={busyDocument === document.id}
                        icon={<Eye className="h-4 w-4" />}
                      >
                        Voir
                      </ActionButton>
                      <ActionButton
                        onClick={() => void downloadDocument(document)}
                        disabled={busyDocument === document.id}
                        icon={<Download className="h-4 w-4" />}
                        secondary
                      >
                        Télécharger
                      </ActionButton>
                      {canEdit && (
                        <ActionButton
                          onClick={() => void removeDocument(document)}
                          disabled={busyDocument === document.id}
                          icon={<Trash2 className="h-4 w-4" />}
                          danger
                        >
                          Supprimer
                        </ActionButton>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {tab === "historique" && (
          <Panel title="Historique" className="mt-6">
            {maintenance.historique.length === 0 ? (
              <p className="mt-4 text-slate-500">Aucun historique.</p>
            ) : (
              <div className="mt-5 space-y-4">
                {maintenance.historique.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {item.action}
                        </p>
                        {item.description && (
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <time className="text-xs text-slate-500">
                        {formatDate(item.created_at)}
                      </time>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Panel>
        )}
      </div>
    </AppShell>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
    </article>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6 ${className}`}
    >
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${
        active
          ? "border-blue-600 text-blue-700 dark:text-blue-300"
          : "border-transparent text-slate-500 dark:text-slate-400"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

type Option = { id: string; label: string };

function TextField({
  label,
  value,
  disabled,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  disabled,
  onChange,
  options,
  emptyLabel = "Sélectionner",
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  options: Option[];
  emptyLabel?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900"
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateField({
  label,
  value,
  disabled,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <input
        type="datetime-local"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  disabled,
  onChange,
  step,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  step: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <input
        type="number"
        min="0"
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <textarea
        rows={5}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900"
      />
    </label>
  );
}

function ActionButton({
  onClick,
  disabled,
  icon,
  children,
  secondary = false,
  danger = false,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  secondary?: boolean;
  danger?: boolean;
}) {
  const classes = danger
    ? "bg-red-600 text-white hover:bg-red-700"
    : secondary
    ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    : "bg-blue-600 text-white hover:bg-blue-700";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60 ${classes}`}
    >
      {icon}
      {children}
    </button>
  );
}