"use client";

import { useLanguage } from "@/components/language-toggle";
import { locales } from "@/lib/i18n";

export default function GuidePage() {
  const { locale } = useLanguage();
  const t = locales[locale].guide;

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 pt-10 pb-20">
      <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-1">{t.title}</h1>
      <p className="text-[15px] text-apple-muted mb-8">{t.subtitle}</p>

      <div className="flex flex-col gap-5">
        {t.tableSections?.map((table, i) => (
          <div key={i} className="bg-white rounded-[20px] p-6">
            <h2 className="font-heading text-[17px] font-semibold tracking-tight mb-3">{table.title}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#f0f0f2]">
                    {table.headers.map((h, j) => (
                      <th key={j} className="font-semibold text-apple-muted py-2.5 pr-4 whitespace-nowrap last:pr-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, j) => (
                    <tr key={j} className={`border-b border-[#f0f0f2] last:border-0 ${j < 2 ? 'font-semibold' : ''}`}>
                      {row.map((cell, k) => (
                        <td key={k} className="text-apple-text py-2.5 pr-4 last:pr-0 whitespace-nowrap">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {t.sections.map((section, i) => (
          <div key={i} className="bg-white rounded-[20px] p-6">
            <h2 className="font-heading text-[17px] font-semibold tracking-tight mb-3">{section.title}</h2>
            <ul className="flex flex-col gap-2.5">
              {section.items.map((item, j) => (
                <li key={j} className="text-[14px] text-apple-text leading-relaxed whitespace-pre-line">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
