import { readFileSync, writeFileSync } from "node:fs";
import type { BusinessPartner, Contact, ContactGp, Invoice, PaymentTerm } from "../model.js";

interface DevState {
  contacts?: Contact[];
  business_partners?: BusinessPartner[];
  contact_gps?: ContactGp[];
  invoices?: Invoice[];
  payment_terms?: PaymentTerm[];
}

export function devStatePath(): string | undefined {
  return process.env.EVARO_SHARED_MEMORY_FILE;
}

export function readDevState(): DevState {
  const path = devStatePath();
  if (!path) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")) as DevState;
  } catch {
    return {};
  }
}

export function writeDevState(update: DevState): void {
  const path = devStatePath();
  if (!path) return;
  const next = { ...readDevState(), ...update };
  writeFileSync(path, JSON.stringify(next), "utf8");
}
