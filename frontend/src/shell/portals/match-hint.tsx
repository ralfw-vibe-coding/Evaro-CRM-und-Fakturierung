import { SearchCheck } from "lucide-react";
import type { MatchHint } from "@/domain/rpus/get-visible-entities/get-visible-entities";

/** Shows where a search match was found, when that field isn't otherwise visible on the card. */
export function MatchHintLine({ hint }: { hint: MatchHint }) {
  return (
    <div className="mt-2 flex items-center gap-1.5 border-t border-[var(--border)] pt-2 text-xs text-[var(--muted-foreground)]">
      <SearchCheck className="size-3.5 shrink-0" />
      <span className="truncate">
        Treffer in {hint.label}: „{hint.snippet}"
      </span>
    </div>
  );
}
