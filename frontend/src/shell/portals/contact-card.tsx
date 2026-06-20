import { Building2, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MatchHintLine } from "./match-hint";
import { OverviewChannelRow } from "./overview-channel-row";
import type { Contact } from "@/domain/model";
import type { MatchHint } from "@/domain/rpus/get-visible-entities/get-visible-entities";

function firstChannelObject(contact: Contact, type: string) {
  return (contact.data.channels ?? []).find((c) => c.type === type);
}

/**
 * Business-card style overview tile. Shows only the fields agreed for the
 * overview: first/last name, company_text, first email and first phone. A
 * person icon and the --brand accent distinguish it from business-partner cards.
 */
export function ContactCard({
  contact,
  connectionCount,
  matchHint,
  selected,
  onClick,
}: {
  contact: Contact;
  connectionCount: number;
  matchHint?: MatchHint;
  selected?: boolean;
  onClick?: () => void;
}) {
  const name = [contact.data.first_name, contact.data.last_name].filter(Boolean).join(" ");
  const company = contact.data.company_text;
  const channels = ["email", "phone", "website"]
    .map((type) => firstChannelObject(contact, type))
    .filter((channel): channel is NonNullable<typeof channel> => Boolean(channel));

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer border-l-4 border-l-[var(--brand)] p-4 transition-shadow hover:shadow-md",
        selected && "ring-2 ring-[var(--brand)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1.5">
          <User className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />
          <span className="truncate font-semibold leading-tight">{name || "—"}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-xs text-[var(--muted-foreground)]" title="Verbundene Geschäftspartner">
          <Building2 className="size-3.5" />
          <span>{connectionCount}</span>
        </div>
      </div>
      {company && (
        <div className="mt-0.5 flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
          <Building2 className="size-3.5 shrink-0" />
          {company}
        </div>
      )}
      {channels.length > 0 && (
        <div className="mt-3 grid gap-1 text-sm">
          {channels.map((channel) => (
            <OverviewChannelRow key={channel.type} channel={channel} />
          ))}
        </div>
      )}
      {matchHint && <MatchHintLine hint={matchHint} />}
    </Card>
  );
}
