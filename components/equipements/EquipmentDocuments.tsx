"use client";

import { useEffect, useState } from "react";
import { FileText, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AppButton, AppCard, AppEmptyState, AppSelect } from "@/components/ui";
import { useDialog } from "@/providers/DialogProvider";

type DocumentItem = {
  id: string;
  titre: string;
  categorie: string;
  fichier_url: string;
  fichier_nom: string;
  extension: string | null;
};

type LinkedDocument = {
  id: string;
  document_id: string;
  documents: DocumentItem | null;
};

type Props = {
  equipementId: string;
};

export default function EquipmentDocuments({ equipementId }: Props) {
  const dialog = useDialog();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [linkedDocuments, setLinkedDocuments] = useState<LinkedDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [loading, setLoading] = useState(false);

  async function chargerDocuments() {
    const { data: docsData } = await supabase
      .from("documents")
      .select("id, titre, categorie, fichier_url, fichier_nom, extension")
      .order("titre");

    const { data: linkedData } = await supabase
      .from("equipements_documents")
      .select(
        "id, document_id, documents(id, titre, categorie, fichier_url, fichier_nom, extension)"
      )
      .eq("equipement_id", equipementId)
      .order("created_at", { ascending: false });

    const formattedLinks: LinkedDocument[] = (linkedData || []).map(
      (item: any) => ({
        id: item.id,
        document_id: item.document_id,
        documents: Array.isArray(item.documents)
          ? item.documents[0] || null
          : item.documents || null,
      })
    );

    setDocuments(docsData || []);
    setLinkedDocuments(formattedLinks);
  }

  useEffect(() => {
    chargerDocuments();
  }, []);

  async function associerDocument() {
    if (!selectedDocumentId) {
      alert("Sélectionne un document.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("equipements_documents").insert({
      equipement_id: equipementId,
      document_id: selectedDocumentId,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setSelectedDocumentId("");
    chargerDocuments();
  }

  async function retirerLien(link: LinkedDocument) {
    const ok = await dialog.delete({
      title: "Retirer ce document ?",
      itemName: link.documents?.titre || "Document lié",
      description:
        "Le document ne sera pas supprimé de la GED. Seul le lien avec cet équipement sera retiré.",
    });

    if (!ok) return;

    const { error } = await supabase
      .from("equipements_documents")
      .delete()
      .eq("id", link.id);

    if (error) {
      alert(error.message);
      return;
    }

    chargerDocuments();
  }

  const linkedIds = linkedDocuments.map((d) => d.document_id);
  const documentsDisponibles = documents.filter(
    (d) => !linkedIds.includes(d.id)
  );

  return (
    <div className="space-y-6">
      <AppCard title="Associer un document existant">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
          <AppSelect
            value={selectedDocumentId}
            onChange={(e) => setSelectedDocumentId(e.target.value)}
            options={[
              { value: "", label: "Sélectionner un document..." },
              ...documentsDisponibles.map((doc) => ({
                value: doc.id,
                label: `${doc.titre} — ${doc.categorie}`,
              })),
            ]}
          />

          <AppButton loading={loading} onClick={associerDocument}>
            Associer
          </AppButton>
        </div>
      </AppCard>

      <AppCard title="Documents liés">
        {linkedDocuments.length === 0 ? (
          <AppEmptyState
            icon={<FileText size={42} />}
            title="Aucun document lié"
            description="Associe un rapport, une notice, un PV ou un contrat à cet équipement."
          />
        ) : (
          <div className="space-y-3">
            {linkedDocuments.map((link) => {
              const doc = link.documents;

              if (!doc) return null;

              return (
                <div
                  key={link.id}
                  className="flex flex-col gap-4 rounded-2xl border border-gray-200 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                      <FileText size={24} />
                    </div>

                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {doc.titre}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {doc.categorie} • {doc.extension || "fichier"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={doc.fichier_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <AppButton variant="secondary" className="px-3 py-2 text-xs">
                        <ExternalLink size={14} />
                        Ouvrir
                      </AppButton>
                    </a>

                    <AppButton
                      variant="danger"
                      className="px-3 py-2 text-xs"
                      onClick={() => retirerLien(link)}
                    >
                      <Trash2 size={14} />
                      Retirer
                    </AppButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AppCard>
    </div>
  );
}