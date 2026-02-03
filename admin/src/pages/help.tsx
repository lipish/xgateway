import { PageHeader } from "@/components/layout/page-header"
import { t } from "@/lib/i18n"

const sections = [
  "overview",
  "quickStart",
  "coreConcepts",
  "configuration",
  "apiUsage",
  "faq",
] as const

type SectionKey = (typeof sections)[number]

export function HelpPage() {
  return (
    <div className="flex-1 min-h-0 flex flex-col page-transition overflow-y-auto p-6 scrollbar-hide">
      <PageHeader
        title={t("help.docsTitle")}
        subtitle={t("help.docsSubtitle")}
      />
      <div className="flex-1 max-w-[1200px] mx-auto w-full">
        <div className="grid gap-8 lg:grid-cols-[1fr_240px]">
          <div className="space-y-10">
            {sections.map((key) => (
              <section key={key} id={key} className="scroll-mt-24 space-y-4">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">{t(`help.docsSections.${key}.title`)}</h2>
                  <p className="text-sm text-muted-foreground">{t(`help.docsSections.${key}.summary`)}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground whitespace-pre-wrap">
                  {t(`help.docsSections.${key}.content`)}
                </div>
              </section>
            ))}
          </div>
          <aside className="hidden lg:block">
            <div className="sticky top-6 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("help.docsNavTitle")}
              </div>
              <nav className="space-y-1 text-sm">
                {sections.map((key) => (
                  <a
                    key={key}
                    href={`#${key}`}
                    className="block rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  >
                    {t(`help.docsSections.${key}.title`)}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
