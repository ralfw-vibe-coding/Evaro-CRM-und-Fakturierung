import type { IngestItem } from "../../model.js";
import type { IngestsProvider } from "../../pproviders/ingests/ingests-provider.js";

export function listIngests(deps: { ingests: IngestsProvider }) {
  return async function process(): Promise<{ ingests: IngestItem[]; pending_count: number }> {
    const [ingests, pending_count] = await Promise.all([
      deps.ingests.list(),
      deps.ingests.countPending(),
    ]);
    return { ingests, pending_count };
  };
}
