// Composition root: wires the frontend's own domain (pProviders + RPUs).
// Portals (React components) call these assembled capabilities; they never
// construct providers or RPUs themselves.

import { httpBackendApiProvider } from "./domain/pproviders/backend-api/http-backend-api-provider.js";
import { browserSessionProvider } from "./domain/pproviders/session/browser-session-provider.js";
import { InMemorySelectionStoreProvider } from "./domain/pproviders/selection-store/in-memory-selection-store-provider.js";
import { InMemoryInvoiceStoreProvider } from "./domain/pproviders/invoice-store/in-memory-invoice-store-provider.js";

import { requestOtp } from "./domain/rpus/request-otp/request-otp.js";
import { verifyOtp } from "./domain/rpus/verify-otp/verify-otp.js";
import { getSession } from "./domain/rpus/get-session/get-session.js";
import { logout } from "./domain/rpus/logout/logout.js";
import { updateProfile } from "./domain/rpus/update-profile/update-profile.js";
import { generateApiKey } from "./domain/rpus/generate-api-key/generate-api-key.js";
import { deleteApiKey } from "./domain/rpus/delete-api-key/delete-api-key.js";
import { loadSelection } from "./domain/rpus/load-selection/load-selection.js";
import { setScope } from "./domain/rpus/set-scope/set-scope.js";
import { setSearchTerm } from "./domain/rpus/set-search-term/set-search-term.js";
import { getVisibleEntities } from "./domain/rpus/get-visible-entities/get-visible-entities.js";
import { selectEntity } from "./domain/rpus/select-entity/select-entity.js";
import { getSelectedEntity } from "./domain/rpus/get-selected-entity/get-selected-entity.js";
import { createContact } from "./domain/rpus/create-contact/create-contact.js";
import { updateContact } from "./domain/rpus/update-contact/update-contact.js";
import { deleteContact } from "./domain/rpus/delete-contact/delete-contact.js";
import { createBusinessPartner } from "./domain/rpus/create-business-partner/create-business-partner.js";
import { updateBusinessPartner } from "./domain/rpus/update-business-partner/update-business-partner.js";
import { deleteBusinessPartner } from "./domain/rpus/delete-business-partner/delete-business-partner.js";
import { linkContactGp } from "./domain/rpus/link-contact-gp/link-contact-gp.js";
import { unlinkContactGp } from "./domain/rpus/unlink-contact-gp/unlink-contact-gp.js";
import { getTagOptions } from "./domain/rpus/get-tag-options/get-tag-options.js";
import { loadInvoicingData } from "./domain/rpus/load-invoicing-data/load-invoicing-data.js";
import { createInvoiceDraft } from "./domain/rpus/create-invoice-draft/create-invoice-draft.js";
import { updateInvoiceDraft } from "./domain/rpus/update-invoice-draft/update-invoice-draft.js";
import { deleteInvoiceDraft } from "./domain/rpus/delete-invoice-draft/delete-invoice-draft.js";
import { billInvoice } from "./domain/rpus/bill-invoice/bill-invoice.js";
import { changeInvoiceStatus } from "./domain/rpus/change-invoice-status/change-invoice-status.js";
import { createPaymentTerm } from "./domain/rpus/create-payment-term/create-payment-term.js";
import { loadAppSettings } from "./domain/rpus/load-app-settings/load-app-settings.js";
import { updateAppSettings } from "./domain/rpus/update-app-settings/update-app-settings.js";

const backendApi = httpBackendApiProvider;
const session = browserSessionProvider;
const selectionStore = new InMemorySelectionStoreProvider();
export const invoiceStore = new InMemoryInvoiceStoreProvider();

export const requestOtpRpu = requestOtp({ backendApi });
export const verifyOtpRpu = verifyOtp({ backendApi, session });
export const getSessionRpu = getSession({ session });
export const logoutRpu = logout({ session });
export const updateProfileRpu = updateProfile({ backendApi, session });
export const generateApiKeyRpu = generateApiKey({ backendApi, session });
export const deleteApiKeyRpu = deleteApiKey({ backendApi, session });
export const loadSelectionRpu = loadSelection({ backendApi, session, selectionStore });
export const setScopeRpu = setScope({ selectionStore });
export const setSearchTermRpu = setSearchTerm({ selectionStore });
export const getVisibleEntitiesRpu = getVisibleEntities({ selectionStore });
export const getBusinessPartnerOptionsRpu = () => selectionStore.get()?.business_partners ?? [];
export const selectEntityRpu = selectEntity({ selectionStore });
export const getSelectedEntityRpu = getSelectedEntity({ selectionStore });
export const createContactRpu = createContact({ backendApi, session, selectionStore });
export const updateContactRpu = updateContact({ backendApi, session, selectionStore });
export const deleteContactRpu = deleteContact({ backendApi, session, selectionStore });
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
export const deleteBusinessPartnerRpu = deleteBusinessPartner({ backendApi, session, selectionStore });
export const linkContactGpRpu = linkContactGp({ backendApi, session, selectionStore });
export const unlinkContactGpRpu = unlinkContactGp({ backendApi, session, selectionStore });
export const getTagOptionsRpu = getTagOptions({ selectionStore });
export const loadInvoicingDataRpu = loadInvoicingData({ backendApi, session, invoiceStore });
export const createInvoiceDraftRpu = createInvoiceDraft({ backendApi, session, invoiceStore });
export const updateInvoiceDraftRpu = updateInvoiceDraft({ backendApi, session, invoiceStore });
export const deleteInvoiceDraftRpu = deleteInvoiceDraft({ backendApi, session, invoiceStore });
export const billInvoiceRpu = billInvoice({ backendApi, session, invoiceStore });
export const changeInvoiceStatusRpu = changeInvoiceStatus({ backendApi, session, invoiceStore });
export const createPaymentTermRpu = createPaymentTerm({ backendApi, session, invoiceStore });
export const loadAppSettingsRpu = loadAppSettings({ backendApi, session });
export const updateAppSettingsRpu = updateAppSettings({ backendApi, session });
