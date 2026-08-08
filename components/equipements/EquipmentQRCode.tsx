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

  const canEdit =
    can("equipements.edit");

  /*
   * URL de production utilisée
   * dans chaque QR Code.
   *
   * Chaque équipement possède donc
   * automatiquement son propre QR Code
   * grâce à son ID.
   */
  const SITE_URL =
  "https://secumanager.vercel.app";

  const url =
    `${SITE_URL}/equipements/${id}`;


  /* =========================================================
     TELECHARGEMENT QR CODE PNG
  ========================================================= */

  function telecharger() {
    const svg =
      document.querySelector(
        "#equipment-qrcode svg"
      );

    if (!svg) {
      console.error(
        "QR Code introuvable."
      );

      return;
    }

    const serializer =
      new XMLSerializer();

    const source =
      serializer.serializeToString(
        svg
      );

    const image =
      new Image();

    image.onload = () => {
      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width = 600;
      canvas.height = 600;

      const ctx =
        canvas.getContext(
          "2d"
        );

      if (!ctx) {
        return;
      }

      ctx.fillStyle =
        "white";

      ctx.fillRect(
        0,
        0,
        600,
        600
      );

      ctx.drawImage(
        image,
        0,
        0,
        600,
        600
      );

      const a =
        document.createElement(
          "a"
        );

      a.download =
        `${numero}.png`;

      a.href =
        canvas.toDataURL(
          "image/png"
        );

      a.click();
    };

    image.src =
      "data:image/svg+xml;base64," +
      btoa(
        unescape(
          encodeURIComponent(
            source
          )
        )
      );
  }


  /* =========================================================
     IMPRESSION ETIQUETTE
     FORMAT : 90 x 60 mm
  ========================================================= */

  function imprimerQRCode() {
    const svg =
      document.querySelector(
        "#equipment-qrcode svg"
      );

    if (!svg) {
      console.error(
        "QR Code introuvable."
      );

      return;
    }

    const serializer =
      new XMLSerializer();

    const qrCodeSVG =
      serializer.serializeToString(
        svg
      );

    const fenetreImpression =
      window.open(
        "",
        "_blank",
        "width=900,height=700"
      );

    if (
      !fenetreImpression
    ) {
      alert(
        "Impossible d’ouvrir la fenêtre d’impression. Vérifiez que les fenêtres pop-up sont autorisées."
      );

      return;
    }

    const emplacementTexte =
      emplacement?.trim() ||
      "Non renseigné";

    /*
     * On utilise le logo présent
     * dans /public/secumanager-logo.png
     */
    const logoUrl =
      `${window.location.origin}/secumanager-logo.png`;


    fenetreImpression.document.write(`
      <!DOCTYPE html>

      <html lang="fr">

        <head>

          <meta charset="UTF-8" />

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />

          <title>
            Étiquette équipement - ${escapeHtml(numero)}
          </title>


          <style>

            * {
              box-sizing: border-box;
            }


            html,
            body {
              margin: 0;
              padding: 0;

              background: #f3f4f6;

              font-family:
                Arial,
                Helvetica,
                sans-serif;

              color: #111827;
            }


            body {
              min-height: 100vh;

              display: flex;

              align-items: center;
              justify-content: center;

              padding: 20px;
            }


            /* ==========================================
               ETIQUETTE
            ========================================== */

            .etiquette {
              width: 90mm;
              height: 60mm;

              background: #ffffff;

              border:
                1.5px solid
                #1554a3;

              border-radius:
                4mm;

              padding:
                3.5mm 4mm 3mm;

              display: flex;
              flex-direction: column;

              overflow: hidden;

              box-shadow:
                0 4px 14px
                rgba(
                  0,
                  0,
                  0,
                  0.15
                );
            }


            /* ==========================================
               HEADER
            ========================================== */

            .header {
              height: 13mm;

              display: flex;

              align-items: center;

              border-bottom:
                1.4px solid
                #1554a3;

              padding-bottom:
                2mm;
            }


            /*
             * Logo volontairement réduit
             * pour garder les proportions
             * et laisser de la place au QR.
             */
            .logo {
              display: block;

              width: 34mm;
              height: auto;

              max-height: 10mm;

              object-fit: contain;

              object-position:
                left center;
            }


            /* ==========================================
               CONTENU PRINCIPAL
            ========================================== */

            .content {
              flex: 1;

              display: grid;

              grid-template-columns:
                29mm 1fr;

              gap: 4mm;

              align-items: center;

              padding:
                2.5mm 0
                1.5mm;
            }


            /* ==========================================
               QR CODE
            ========================================== */

            .qr-zone {
              display: flex;

              align-items: center;
              justify-content: center;
            }


            .qr-zone svg {
              width: 27mm;
              height: 27mm;

              display: block;
            }


            /* ==========================================
               INFOS EQUIPEMENT
            ========================================== */

            .infos {
              min-width: 0;

              display: flex;
              flex-direction: column;

              justify-content: center;

              text-align: left;
            }


            .numero {
              margin: 0;

              color:
                #1554a3;

              font-size:
                15px;

              line-height:
                1.1;

              font-weight:
                900;

              overflow-wrap:
                anywhere;
            }


            .nom {
              margin:
                2mm 0 0;

              font-size:
                10px;

              line-height:
                1.25;

              font-weight:
                800;

              text-transform:
                uppercase;

              overflow-wrap:
                anywhere;
            }


            .emplacement {
              margin-top:
                3mm;

              font-size:
                9px;

              line-height:
                1.25;

              overflow-wrap:
                anywhere;
            }


            .emplacement-label {
              display: block;

              margin-bottom:
                0.6mm;

              font-size:
                8px;

              font-weight:
                800;

              color:
                #374151;
            }


            /* ==========================================
               FOOTER
            ========================================== */

            .footer {
              min-height:
                5mm;

              display: flex;

              align-items: center;

              border-top:
                1px solid
                #d1d5db;

              padding-top:
                1.3mm;

              font-size:
                6.3px;

              line-height:
                1.2;

              color:
                #4b5563;

              white-space:
                nowrap;
            }


            /* ==========================================
               IMPRESSION
            ========================================== */

            @page {
              size:
                90mm 60mm;

              margin: 0;
            }


            @media print {

              html,
              body {
                width:
                  90mm;

                height:
                  60mm;

                margin:
                  0 !important;

                padding:
                  0 !important;

                background:
                  white !important;
              }


              body {
                display: block;
              }


              .etiquette {
                width:
                  90mm;

                height:
                  60mm;

                margin: 0;

                border:
                  1.5px solid
                  #1554a3;

                border-radius:
                  4mm;

                box-shadow:
                  none;

                page-break-inside:
                  avoid;

                print-color-adjust:
                  exact;

                -webkit-print-color-adjust:
                  exact;
              }

            }

          </style>

        </head>


        <body>

          <div class="etiquette">


            <!-- ==============================
                 LOGO
            =============================== -->

            <div class="header">

              <img
                src="${logoUrl}"
                alt="SécuManager"
                class="logo"
              />

            </div>


            <!-- ==============================
                 CONTENU
            =============================== -->

            <div class="content">


              <!-- QR CODE -->

              <div class="qr-zone">

                ${qrCodeSVG}

              </div>


              <!-- INFORMATIONS -->

              <div class="infos">

                <p class="numero">
                  ${escapeHtml(numero)}
                </p>


                <p class="nom">
                  ${escapeHtml(nom)}
                </p>


                <div class="emplacement">

                  <span class="emplacement-label">
                    Emplacement
                  </span>

                  ${escapeHtml(
                    emplacementTexte
                  )}

                </div>

              </div>

            </div>


            <!-- ==============================
                 FOOTER
            =============================== -->

            <div class="footer">

              Scanner le QR code pour accéder directement à la fiche équipement dans SécuManager.

            </div>


          </div>


          <script>

            /*
             * On attend volontairement
             * quelques millisecondes
             * afin que le logo soit chargé
             * avant l'ouverture
             * de l'impression.
             */

            window.onload =
              function () {

                setTimeout(
                  function () {
                    window.print();
                  },
                  500
                );

              };


            window.onafterprint =
              function () {

                window.close();

              };

          </script>

        </body>

      </html>
    `);


    fenetreImpression.document.close();
  }


  /* =========================================================
     AFFICHAGE DANS LA FICHE EQUIPEMENT
  ========================================================= */

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
            onClick={
              telecharger
            }
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-white transition hover:bg-blue-700"
          >
            <Download
              size={18}
            />

            Télécharger
          </button>


          <button
            type="button"
            onClick={
              imprimerQRCode
            }
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 transition hover:bg-gray-50 dark:hover:bg-slate-900"
          >
            <Printer
              size={18}
            />

            Imprimer le QR code
          </button>

        </div>
      )}

    </div>
  );
}


/* =========================================================
   SECURISATION TEXTE HTML
========================================================= */

function escapeHtml(
  value: string
): string {
  return value
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}