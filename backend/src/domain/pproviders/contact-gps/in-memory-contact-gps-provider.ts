import type { ContactGp } from "../../model.js";
import { devStatePath, readDevState, writeDevState } from "../dev-file-state.js";
import type { ContactGpInput, ContactGpsProvider } from "./contact-gps-provider.js";

function key(contact_id: string, gp_id: string): string {
  return `${contact_id}:${gp_id}`;
}

export class InMemoryContactGpsProvider implements ContactGpsProvider {
  private readonly links = new Map<string, ContactGp>();

  constructor() {
    this.hydrate();
  }

  private hydrate(): void {
    const existing = devStatePath() ? readDevState().contact_gps : undefined;
    if (!existing) return;
    this.links.clear();
    for (const link of existing) this.links.set(key(link.contact_id, link.gp_id), link);
  }

  private persist(): void {
    writeDevState({ contact_gps: [...this.links.values()] });
  }

  async listAll(): Promise<ContactGp[]> {
    this.hydrate();
    return [...this.links.values()].map((link) => structuredClone(link));
  }

  async upsert(input: ContactGpInput): Promise<ContactGp> {
    this.hydrate();
    if (input.primary) {
      for (const [existingKey, link] of this.links) {
        if (link.contact_id === input.contact_id && link.primary) {
          this.links.set(existingKey, { ...link, primary: false });
        }
      }
    }

    const existing = this.links.get(key(input.contact_id, input.gp_id));
    const link: ContactGp = {
      contact_id: input.contact_id,
      gp_id: input.gp_id,
      role: input.role,
      primary: input.primary ?? false,
      created_at: existing?.created_at ?? new Date().toISOString(),
    };
    this.links.set(key(input.contact_id, input.gp_id), link);
    this.persist();
    return structuredClone(link);
  }

  async delete(contact_id: string, gp_id: string): Promise<boolean> {
    this.hydrate();
    const deleted = this.links.delete(key(contact_id, gp_id));
    this.persist();
    return deleted;
  }

  async deleteForContact(contact_id: string): Promise<number> {
    this.hydrate();
    let count = 0;
    for (const [existingKey, link] of this.links) {
      if (link.contact_id !== contact_id) continue;
      this.links.delete(existingKey);
      count += 1;
    }
    this.persist();
    return count;
  }

  async deleteForBusinessPartner(gp_id: string): Promise<number> {
    this.hydrate();
    let count = 0;
    for (const [existingKey, link] of this.links) {
      if (link.gp_id !== gp_id) continue;
      this.links.delete(existingKey);
      count += 1;
    }
    this.persist();
    return count;
  }
}
