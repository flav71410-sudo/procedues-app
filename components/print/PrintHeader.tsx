type PrintHeaderProps = {
  title: string;
  reference?: string | null;
  magasin?: string | null;
  dateImpression?: string | null;
  imprimePar?: string | null;
  role?: string | null;
};

export default function PrintHeader({
  title,
  reference,
  magasin,
  dateImpression,
  imprimePar,
  role,
}: PrintHeaderProps) {
  return (
    <header className="border-b-4 border-blue-600 pb-5">
      <div className="flex items-start justify-between gap-8">
        {/* LOGO */}
        <div className="min-w-0">
          <img
            src="/secumanager-logo.png"
            alt="SécuManager"
            className="h-auto w-52 max-w-full object-contain"
          />
        </div>

        {/* TITRE DOCUMENT */}
        <div className="text-right">
          <h1 className="text-2xl font-black text-slate-900">
            {title}
          </h1>

          {reference && (
            <p className="mt-1 font-mono text-sm font-bold text-blue-700">
              {reference}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-slate-600">
        <p>
          <strong>Magasin :</strong>{" "}
          {magasin || "Non défini"}
        </p>

        <p className="text-right">
          <strong>Imprimé le :</strong>{" "}
          {dateImpression || "—"}
        </p>

        <p>
          <strong>Imprimé par :</strong>{" "}
          {imprimePar || "—"}
        </p>

        <p className="text-right">
          <strong>Rôle :</strong>{" "}
          {role || "—"}
        </p>
      </div>
    </header>
  );
}