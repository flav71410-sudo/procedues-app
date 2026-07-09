"use client";

import { ReactNode } from "react";

type Props = {
  headers: string[];
  children: ReactNode;
  empty?: ReactNode;
};

export default function AppTable({
  headers,
  children,
  empty,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-slate-950">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="
                    px-6
                    py-4
                    text-left
                    text-xs
                    font-bold
                    uppercase
                    tracking-wider
                    text-gray-600
                    dark:text-slate-400
                  "
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {children}
          </tbody>
        </table>

        {empty}
      </div>
    </div>
  );
}