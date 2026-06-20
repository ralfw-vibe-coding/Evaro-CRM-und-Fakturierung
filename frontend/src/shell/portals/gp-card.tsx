import { Building2, MapPin, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MatchHintLine } from "./match-hint";
import { OverviewChannelRow } from "./overview-channel-row";
import type { BusinessPartner } from "@/domain/model";
import type { MatchHint } from "@/domain/rpus/get-visible-entities/get-visible-entities";

function firstChannelObject(bp: BusinessPartner, type: string) {
  return bp.data.channels.find((c) => c.type === type);
}

/**
 * Business-card style tile for a business partner. Shows the agreed overview
 * fields: name, type badges, city, first channel. A building icon and the --gp
 * accent distinguish it from contact (person) cards.
 */
export function GpCard({
  bp,
  connectionCount,
  matchHint,
  selected,
  onClick,
}: {
  bp: BusinessPartner;
  connectionCount: number;
  matchHint?: MatchHint;
  selected?: boolean;
  onClick?: () => void;
}) {
  const city = bp.data.address?.city;
  const channels = ["email", "phone", "website"]
    .map((type) => firstChannelObject(bp, type))
    .filter((channel): channel is NonNullable<typeof channel> => Boolean(channel));

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer border-l-4 border-l-[var(--gp)] p-4 transition-shadow hover:shadow-md",
        selected && "ring-2 ring-[var(--gp)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1.5">
          <Building2 className="mt-0.5 size-4 shrink-0 text-[var(--gp)]" />
          <span className="truncate font-semibold leading-tight">{bp.data.name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-xs text-[var(--muted-foreground)]" title="Verbundene Kontakte">
          <User className="size-3.5" />
          <span>{connectionCount}</span>
        </div>
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

      {(city || channels.length > 0) && (
        <div className="mt-3 grid gap-1 text-sm">
          {city && (
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0 text-[var(--muted-foreground)]" />
              <span className="truncate">{city}</span>
            </div>
          )}
          {channels.map((channel) => (
            <OverviewChannelRow key={channel.type} channel={channel} />
          ))}
        </div>
      )}
      {matchHint && <MatchHintLine hint={matchHint} />}
    </Card>
  );
}
