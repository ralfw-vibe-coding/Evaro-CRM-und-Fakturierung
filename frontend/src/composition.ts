// Composition root: wires the frontend's own domain (pProviders + RPUs).
// Portals (React components) call these assembled capabilities; they never
// construct providers or RPUs themselves.

import { httpBackendApiProvider } from "./domain/pproviders/backend-api/http-backend-api-provider.js";
import { browserSessionProvider } from "./domain/pproviders/session/browser-session-provider.js";
import { InMemorySelectionStoreProvider } from "./domain/pproviders/selection-store/in-memory-selection-store-provider.js";

import { requestOtp } from "./domain/rpus/request-otp/request-otp.js";
import { verifyOtp } from "./domain/rpus/verify-otp/verify-otp.js";
import { getSession } from "./domain/rpus/get-session/get-session.js";
import { logout } from "./domain/rpus/logout/logout.js";
import { loadSelection } from "./domain/rpus/load-selection/load-selection.js";
import { setScope } from "./domain/rpus/set-scope/set-scope.js";
import { setSearchTerm } from "./domain/rpus/set-search-term/set-search-term.js";
import { getVisibleEntities } from "./domain/rpus/get-visible-entities/get-visible-entities.js";
import { selectEntity } from "./domain/rpus/select-entity/select-entity.js";
import { getSelectedEntity } from "./domain/rpus/get-selected-entity/get-selected-entity.js";
import { createContact } from "./domain/rpus/create-contact/create-contact.js";
import { updateContact } from "./domain/rpus/update-contact/update-contact.js";
import { createBusinessPartner } from "./domain/rpus/create-business-partner/create-business-partner.js";
import { updateBusinessPartner } from "./domain/rpus/update-business-partner/update-business-partner.js";
import { linkContactGp } from "./domain/rpus/link-contact-gp/link-contact-gp.js";
import { unlinkContactGp } from "./domain/rpus/unlink-contact-gp/unlink-contact-gp.js";
import { getTagOptions } from "./domain/rpus/get-tag-options/get-tag-options.js";

const backendApi = httpBackendApiProvider;
const session = browserSessionProvider;
const selectionStore = new InMemorySelectionStoreProvider();

export const requestOtpRpu = requestOtp({ backendApi });
export const verifyOtpRpu = verifyOtp({ backendApi, session });
export const getSessionRpu = getSession({ session });
export const logoutRpu = logout({ session });
export const loadSelectionRpu = loadSelection({ backendApi, session, selectionStore });
export const setScopeRpu = setScope({ selectionStore });
export const setSearchTermRpu = setSearchTerm({ selectionStore });
export const getVisibleEntitiesRpu = getVisibleEntities({ selectionStore });
export const selectEntityRpu = selectEntity({ selectionStore });
export const getSelectedEntityRpu = getSelectedEntity({ selectionStore });
export const createContactRpu = createContact({ backendApi, session, selectionStore });
export const updateContactRpu = updateContact({ backendApi, session, selectionStore });
export const createBusinessPartnerRpu = createBusinessPartner({
  backendApi,
  session,
  selectionStore,
});
export const updateBusinessPartnerRpu = updateBusinessPartner({
  backendApi,
  session,
  selectionStore,
});
export const linkContactGpRpu = linkContactGp({ backendApi, session, selectionStore });
export const unlinkContactGpRpu = unlinkContactGp({ backendApi, session, selectionStore });
export const getTagOptionsRpu = getTagOptions({ selectionStore });
