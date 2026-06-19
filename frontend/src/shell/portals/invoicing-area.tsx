import { Receipt } from "lucide-react";

/** Invoicing area — empty placeholder for now (specified separately later). */
export function InvoicingArea() {
  return (
    <div className="grid h-full place-items-center">
      <div className="flex flex-col items-center gap-2 text-[var(--muted-foreground)]">
        <Receipt className="size-8" />
        <p className="text-sm">Fakturierung folgt.</p>
      </div>
    </div>
  );
}
