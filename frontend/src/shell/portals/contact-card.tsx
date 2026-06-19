import { Mail, Phone, Building2, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MatchHintLine } from "./match-hint";
import type { Contact } from "@/domain/model";
import type { MatchHint } from "@/domain/rpus/get-visible-entities/get-visible-entities";

function firstChannel(contact: Contact, type: string): string | undefined {
  return contact.data.channels.find((c) => c.type === type)?.address;
}

/**
 * Business-card style overview tile. Shows only the fields agreed for the
 * overview: first/last name, company_text, first email and first phone. A
 * person icon and the --brand accent distinguish it from business-partner cards.
 */
export function ContactCard({
  contact,
  matchHint,
  selected,
  onClick,
}: {
  contact: Contact;
  matchHint?: MatchHint;
  selected?: boolean;
  onClick?: () => void;
}) {
  const name = [contact.data.first_name, contact.data.last_name].filter(Boolean).join(" ");
  const company = contact.data.company_text;
  const email = firstChannel(contact, "email");
  const phone = firstChannel(contact, "phone");

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer border-l-4 border-l-[var(--brand)] p-4 transition-shadow hover:shadow-md",
        selected && "ring-2 ring-[var(--brand)]",
      )}
    >
      <div className="flex items-start gap-1.5">
        <User className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />
        <span className="font-semibold leading-tight">{name || "—"}</span>
      </div>
      {company && (
        <div className="mt-0.5 flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
          <Building2 className="size-3.5 shrink-0" />
          {company}
        </div>
      )}
      {(email || phone) && (
        <div className="mt-3 grid gap-1 text-sm">
          {email && (
            <div className="flex items-center gap-1.5">
              <Mail className="size-3.5 shrink-0 text-[var(--muted-foreground)]" />
              <span className="truncate">{email}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="size-3.5 shrink-0 text-[var(--muted-foreground)]" />
              <span className="truncate">{phone}</span>
            </div>
          )}
        </div>
      )}
      {matchHint && <MatchHintLine hint={matchHint} />}
    </Card>
  );
}
