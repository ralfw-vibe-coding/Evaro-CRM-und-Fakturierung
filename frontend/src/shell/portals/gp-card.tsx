import { Building2, MapPin, MapPinned, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MatchHintLine } from "./match-hint";
import { OverviewChannelRow } from "./overview-channel-row";
import type { BusinessPartner } from "@/domain/model";
import type { MatchHint } from "@/domain/rpus/get-visible-entities/get-visible-entities";

function firstChannelObject(bp: BusinessPartner, type: string) {
  return (bp.data.channels ?? []).find((c) => c.type === type);
}

function mapsUrl(bp: BusinessPartner): string | null {
  const address = bp.data.address;
  const query = [address?.street, address?.zip, address?.city, address?.country].filter(Boolean).join(" ");
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Business-card style tile for a business partner. Shows the agreed overview
 * fields: name, city, first channels. A building icon and the --gp
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
  const mapLink = mapsUrl(bp);
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
          <span className="truncate font-semibold leading-tight">{bp.data.name || "—"}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-xs text-[var(--muted-foreground)]" title="Verbundene Kontakte">
          <User className="size-3.5" />
          <span>{connectionCount}</span>
        </div>
      </div>

      {(city || channels.length > 0) && (
        <div className="mt-3 grid gap-1 text-sm">
          {city && (
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0 text-[var(--muted-foreground)]" />
              <span className="truncate">{city}</span>
              {mapLink && (
                <a
                  href={mapLink}
                  target="_blank"
                  rel="noreferrer"
                  className="grid size-5 shrink-0 place-items-center rounded-sm text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                  aria-label="Ort in Google Maps öffnen"
                  title="Ort in Google Maps öffnen"
                  onClick={(event) => event.stopPropagation()}
                >
                  <MapPinned className="size-3.5" />
                </a>
              )}
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
