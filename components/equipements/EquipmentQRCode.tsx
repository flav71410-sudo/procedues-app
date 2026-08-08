"use client";

import { QRCodeSVG } from "qrcode.react";
import { Download, Printer } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

type Props = {
  id: string;
  numero: string;
  nom: string;
  emplacement?: string | null;
};

export default function EquipmentQRCode({
  id,
  numero,
  nom,
  emplacement,
}: Props) {
  const { can } = useAuth();
  const canEdit = can("equipements.edit");

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/equipements/${id}`
      : "";

  function telecharger() {
    const svg = document.querySelector(
      "#equipment-qrcode svg"
    );

    if (!svg) return;

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);

    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");

      canvas.width = 600;
      canvas.height = 600;

      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 600, 600);

      ctx.drawImage(image, 0, 0, 600, 600);

      const a = document.createElement("a");

      a.download = `${numero}.png`;
      a.href = canvas.toDataURL("image/png");

      a.click();
    };

    image.src =
      "data:image/svg+xml;base64," +
      btoa(
        unescape(
          encodeURIComponent(source)
        )
      );
  }

  function imprimerQRCode() {
    const svg = document.querySelector(
      "#equipment-qrcode svg"
    );

    if (!svg) {
      console.error("QR Code introuvable.");
      return;
    }

    const serializer = new XMLSerializer();
    const qrCodeSVG =
      serializer.serializeToString(svg);

    const fenetreImpression = window.open(
      "",
      "_blank",
      "width=600,height=750"
    );

    if (!fenetreImpression) {
      alert(
        "Impossible d’ouvrir la fenêtre d’impression. Vérifiez que les fenêtres pop-up sont autorisées."
      );
      return;
    }

    const emplacementTexte =
      emplacement?.trim() || "Non renseigné";

    fenetreImpression.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8" />

          <title>QR Code - ${escapeHtml(numero)}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: white;
              font-family:
                Arial,
                Helvetica,
                sans-serif;
              color: #111827;
            }

            body {
              padding: 20px;
            }

            .etiquette {
              width: 90mm;
              min-height: 110mm;

              margin: 0 auto;

              border: 2px solid #111827;
              border-radius: 12px;

              padding: 8mm;

              display: flex;
              flex-direction: column;
              align-items: center;

              text-align: center;
            }

            .header {
              width: 100%;

              padding-bottom: 5mm;
              margin-bottom: 5mm;

              border-bottom: 1px solid #d1d5db;
            }

            .castomanager {
              margin: 0;

              font-size: 20px;
              font-weight: 800;
            }

            .subtitle {
              margin: 3px 0 0;

              font-size: 11px;
              color: #6b7280;
            }

            .qr-code {
              display: flex;
              justify-content: center;
              align-items: center;

              margin: 3mm 0 5mm;
            }

            .qr-code svg {
              width: 55mm;
              height: 55mm;
            }

            .numero {
              margin: 0;

              font-size: 22px;
              font-weight: 800;
            }

            .nom {
              margin: 2mm 0 0;

              font-size: 15px;
              font-weight: 600;
            }

            .emplacement {
              width: 100%;

              margin-top: 5mm;
              padding-top: 4mm;

              border-top: 1px solid #e5e7eb;

              font-size: 12px;
            }

            .emplacement strong {
              display: block;

              margin-bottom: 2px;

              font-size: 10px;
              text-transform: uppercase;
              color: #6b7280;
            }

            .footer {
              margin-top: auto;
              padding-top: 5mm;

              font-size: 9px;
              color: #6b7280;
            }

            @media print {
              @page {
                size: auto;
                margin: 5mm;
              }

              body {
                padding: 0;
              }

              .etiquette {
                margin: 0 auto;
              }
            }
          </style>
        </head>

        <body>
          <div class="etiquette">

            <div class="header">
              <p class="castomanager">
                CastoManager
              </p>

              <p class="subtitle">
                Identification équipement
              </p>
            </div>

            <div class="qr-code">
              ${qrCodeSVG}
            </div>

            <p class="numero">
              ${escapeHtml(numero)}
            </p>

            <p class="nom">
              ${escapeHtml(nom)}
            </p>

            <div class="emplacement">
              <strong>
                Emplacement
              </strong>

              ${escapeHtml(emplacementTexte)}
            </div>

            <div class="footer">
              Scanner le QR code pour accéder
              directement à la fiche équipement
              dans CastoManager.
            </div>

          </div>

          <script>
            window.onload = function () {
              setTimeout(function () {
                window.print();
              }, 250);
            };

            window.onafterprint = function () {
              window.close();
            };
          </script>
        </body>
      </html>
    `);

    fenetreImpression.document.close();
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow dark:bg-slate-950">
      <h3 className="text-lg font-bold">
        QR Code
      </h3>

      <p className="mt-1 text-sm text-gray-500">
        Scanner pour ouvrir directement cette fiche.
      </p>

      <div
        id="equipment-qrcode"
        className="mt-6 flex justify-center"
      >
        <QRCodeSVG
          value={url}
          size={220}
          includeMargin
        />
      </div>

      <div className="mt-6 text-center">
        <p className="font-semibold">
          {numero}
        </p>

        <p className="text-sm text-gray-500">
          {nom}
        </p>

        {emplacement && (
          <p className="mt-1 text-xs text-gray-400">
            {emplacement}
          </p>
        )}
      </div>

      {canEdit && (
        <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={telecharger}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-white transition hover:bg-blue-700"
        >
          <Download size={18} />
          Télécharger
        </button>

        <button
          type="button"
          onClick={imprimerQRCode}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 transition hover:bg-gray-50 dark:hover:bg-slate-900"
        >
          <Printer size={18} />
          Imprimer le QR code
        </button>
        </div>
      )}
    </div>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}