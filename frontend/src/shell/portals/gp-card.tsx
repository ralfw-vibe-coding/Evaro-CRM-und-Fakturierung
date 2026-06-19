import { Building2, MapPin, Link as LinkIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MatchHintLine } from "./match-hint";
import type { BusinessPartner } from "@/domain/model";
import type { MatchHint } from "@/domain/rpus/get-visible-entities/get-visible-entities";

function primaryChannel(bp: BusinessPartner): string | undefined {
  const channels = bp.data.channels;
  return (
    channels.find((c) => c.type === "website")?.address ??
    channels.find((c) => c.type === "email")?.address ??
    channels[0]?.address
  );
}

/**
 * Business-card style tile for a business partner. Shows the agreed overview
 * fields: name, type badges, city, first channel. A building icon and the --gp
 * accent distinguish it from contact (person) cards.
 */
export function GpCard({
  bp,
  matchHint,
  selected,
  onClick,
}: {
  bp: BusinessPartner;
  matchHint?: MatchHint;
  selected?: boolean;
  onClick?: () => void;
}) {
  const city = bp.data.address?.city;
  const channel = primaryChannel(bp);

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer border-l-4 border-l-[var(--gp)] p-4 transition-shadow hover:shadow-md",
        selected && "ring-2 ring-[var(--gp)]",
      )}
    >
      <div className="flex items-start gap-1.5">
        <Building2 className="mt-0.5 size-4 shrink-0 text-[var(--gp)]" />
        <span className="font-semibold leading-tight">{bp.data.name}</span>
      </div>

      {bp.types.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {bp.types.map((type) => (
            <span
              key={type}
              className="rounded-full bg-[var(--gp)]/10 px-2 py-0.5 text-xs font-medium text-[var(--gp)]"
            >
              {type}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 grid gap-1 text-sm">
        {city && (
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0 text-[var(--muted-foreground)]" />
            <span className="truncate">{city}</span>
          </div>
        )}
        {channel && (
          <div className="flex items-center gap-1.5">
            <LinkIcon className="size-3.5 shrink-0 text-[var(--muted-foreground)]" />
            <span className="truncate">{channel}</span>
          </div>
        )}
      </div>
      {matchHint && <MatchHintLine hint={matchHint} />}
    </Card>
  );
}
