import {
  persistContactGpLink,
  type LinkContactGpCommand,
  type LinkContactGpResult,
  type PersistContactGpLinkDeps,
} from "@/domain/contact-gp-link";

export type { LinkContactGpCommand, LinkContactGpResult };

/**
 * RPU (Command): link an existing contact with an existing business partner.
 * The actual persist+mirror logic is shared with the draft-link RPUs.
 */
export function linkContactGp(deps: PersistContactGpLinkDeps) {
  return async function process(command: LinkContactGpCommand): Promise<LinkContactGpResult> {
    return persistContactGpLink(deps, command);
  };
}
