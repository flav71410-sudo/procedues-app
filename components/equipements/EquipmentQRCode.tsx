"use client";

import { QRCodeSVG } from "qrcode.react";
import { Download, Printer } from "lucide-react";

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
}: Props) {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/equipements/${id}`
      : "";

  function telecharger() {
    const svg = document.querySelector("#equipment-qrcode svg");

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

      ctx.drawImage(image, 0, 0);

      const a = document.createElement("a");

      a.download = `${numero}.png`;
      a.href = canvas.toDataURL("image/png");

      a.click();
    };

    image.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(source)));
  }

  return (
    <div className="rounded-2xl border bg-white dark:bg-slate-950 p-6 shadow">
      <h3 className="text-lg font-bold">
        QR Code
      </h3>

      <p className="text-sm text-gray-500 mt-1">
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
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={telecharger}
          className="flex-1 rounded-xl bg-blue-600 text-white py-3 flex justify-center gap-2"
        >
          <Download size={18} />
          Télécharger
        </button>

        <button
          onClick={() => window.print()}
          className="flex-1 rounded-xl border py-3 flex justify-center gap-2"
        >
          <Printer size={18} />
          Imprimer
        </button>
      </div>
    </div>
  );
}