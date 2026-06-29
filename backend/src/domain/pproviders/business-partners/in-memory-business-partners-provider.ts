import { randomUUID } from "node:crypto";
import type { BusinessPartner } from "../../model.js";
import type {
  BusinessPartnersProvider,
  BusinessPartnerUpdate,
  NewBusinessPartner,
} from "./business-partners-provider.js";
import { devStatePath, readDevState, writeDevState } from "../dev-file-state.js";

/**
 * Lightweight in-memory implementation for local development and tests. An
 * optional seed lets local dev start with sample data.
 */
export class InMemoryBusinessPartnersProvider implements BusinessPartnersProvider {
  private readonly bps = new Map<string, BusinessPartner>();

  constructor(seed: NewBusinessPartner[] = []) {
    const existing = devStatePath() ? readDevState().business_partners : undefined;
    if (existing) {
      for (const bp of existing) this.bps.set(bp.id, bp);
      return;
    }
    for (const input of seed) this.store(input);
    this.persist();
  }

  private hydrate(): void {
    const existing = devStatePath() ? readDevState().business_partners : undefined;
    if (!existing) return;
    this.bps.clear();
    for (const bp of existing) this.bps.set(bp.id, bp);
  }

  private persist(): void {
    writeDevState({ business_partners: [...this.bps.values()] });
  }

  private store(input: NewBusinessPartner): BusinessPartner {
    const now = new Date().toISOString();
    const bp: BusinessPartner = {
      id: randomUUID(),
      active: input.active ?? true,
      types: [...input.types],
      data: structuredClone(input.data),
      created_at: now,
      updated_at: now,
    };
    this.bps.set(bp.id, bp);
    return bp;
  }

  async listAll(): Promise<BusinessPartner[]> {
    this.hydrate();
    return [...this.bps.values()].map((bp) => structuredClone(bp));
  }

  async listActive(): Promise<BusinessPartner[]> {
    this.hydrate();
    return [...this.bps.values()].filter((bp) => bp.active).map((bp) => structuredClone(bp));
  }

  async insert(input: NewBusinessPartner): Promise<BusinessPartner> {
    this.hydrate();
    const bp = this.store(input);
    this.persist();
    return structuredClone(bp);
  }

  async findById(id: string): Promise<BusinessPartner | null> {
    this.hydrate();
    const bp = this.bps.get(id);
    return bp ? structuredClone(bp) : null;
  }

  async update(id: string, update: BusinessPartnerUpdate): Promise<BusinessPartner | null> {
    this.hydrate();
    const existing = this.bps.get(id);
    if (!existing) return null;

    const updated: BusinessPartner = {
      ...existing,
      active: update.active ?? existing.active,
      types: [...update.types],
      data: structuredClone(update.data),
      updated_at: new Date().toISOString(),
    };
    this.bps.set(id, updated);
    this.persist();
    return structuredClone(updated);
  }

  async delete(id: string): Promise<boolean> {
    this.hydrate();
    const deleted = this.bps.delete(id);
    this.persist();
    return deleted;
  }
}
