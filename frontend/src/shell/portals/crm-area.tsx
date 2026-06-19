import { Filter, IdCard, PanelRight } from "lucide-react";

/**
 * CRM area: three-column layout (empty scaffold for now).
 *  - left:   filters (save / select / delete) — coming in a later step
 *  - middle: contact cards (business-card style) — coming in a later step
 *  - right:  details of the selected contact — coming in a later step
 */
export function CrmArea() {
  return (
    <div className="grid h-full grid-cols-[260px_1fr_340px] divide-x divide-[var(--border)]">
      <Column icon={<Filter className="size-4" />} title="Filter">
        <Placeholder>Filter folgen.</Placeholder>
      </Column>
      <Column icon={<IdCard className="size-4" />} title="Kontakte">
        <Placeholder>Kontaktkarten folgen.</Placeholder>
      </Column>
      <Column icon={<PanelRight className="size-4" />} title="Details">
        <Placeholder>Wähle einen Kontakt.</Placeholder>
      </Column>
    </div>
  );
}

function Column({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid min-h-0 grid-rows-[auto_1fr]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5 text-sm font-medium">
        {icon}
        {title}
      </div>
      <div className="min-h-0 overflow-auto p-4">{children}</div>
    </section>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-full place-items-center text-center text-sm text-[var(--muted-foreground)]">
      {children}
    </div>
  );
}
