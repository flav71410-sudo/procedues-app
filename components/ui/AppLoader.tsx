"use client";

type Props = {
  text?: string;
  fullScreen?: boolean;
};

export default function AppLoader({
  text = "Chargement...",
  fullScreen = false,
}: Props) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-5 py-10">
      <div className="relative">
        <div className="h-14 w-14 rounded-full border-4 border-slate-200 dark:border-slate-700"></div>

        <div className="absolute inset-0 h-14 w-14 animate-spin rounded-full border-4 border-transparent border-t-[#0078B8]"></div>
      </div>

      <div className="text-center">
        <p className="font-semibold text-gray-800 dark:text-white">
          {text}
        </p>

        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Merci de patienter...
        </p>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}