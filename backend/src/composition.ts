// Composition root: reads configuration and wires pProviders, xProviders,
// RPUs and reactors together. Portals import the assembled capabilities from
// here so they stay thin.

import type { ContactsProvider } from "./domain/pproviders/contacts/contacts-provider.js";
import { InMemoryContactsProvider } from "./domain/pproviders/contacts/in-memory-contacts-provider.js";
import { PostgresContactsProvider } from "./domain/pproviders/contacts/postgres-contacts-provider.js";

import type { ActivityLogProvider } from "./domain/pproviders/activity-log/activity-log-provider.js";
import { InMemoryActivityLogProvider } from "./domain/pproviders/activity-log/in-memory-activity-log-provider.js";
import { PostgresActivityLogProvider } from "./domain/pproviders/activity-log/postgres-activity-log-provider.js";

import type { UsersProvider } from "./domain/pproviders/users/users-provider.js";
import { InMemoryUsersProvider } from "./domain/pproviders/users/in-memory-users-provider.js";
import { PostgresUsersProvider } from "./domain/pproviders/users/postgres-users-provider.js";

import type { BusinessPartnersProvider } from "./domain/pproviders/business-partners/business-partners-provider.js";
import { InMemoryBusinessPartnersProvider } from "./domain/pproviders/business-partners/in-memory-business-partners-provider.js";
import { PostgresBusinessPartnersProvider } from "./domain/pproviders/business-partners/postgres-business-partners-provider.js";
import type { ContactGpsProvider } from "./domain/pproviders/contact-gps/contact-gps-provider.js";
import { InMemoryContactGpsProvider } from "./domain/pproviders/contact-gps/in-memory-contact-gps-provider.js";
import { PostgresContactGpsProvider } from "./domain/pproviders/contact-gps/postgres-contact-gps-provider.js";
import type { InvoicesProvider } from "./domain/pproviders/invoices/invoices-provider.js";
import { InMemoryInvoicesProvider } from "./domain/pproviders/invoices/in-memory-invoices-provider.js";
import { PostgresInvoicesProvider } from "./domain/pproviders/invoices/postgres-invoices-provider.js";

import { JwtTokensProvider } from "./shell/xproviders/tokens/jwt-tokens-provider.js";
import type { TokensProvider } from "./shell/xproviders/tokens/tokens-provider.js";
import { ResendEmailProvider } from "./shell/xproviders/email/resend-email-provider.js";
import { InMemoryOtpProvider } from "./shell/xproviders/otp/in-memory-otp-provider.js";
import { PostgresOtpProvider } from "./shell/xproviders/otp/postgres-otp-provider.js";
import type { OtpProvider } from "./shell/xproviders/otp/otp-provider.js";

import { createContact } from "./domain/rpus/create-contact/create-contact.js";
import { updateContact } from "./domain/rpus/update-contact/update-contact.js";
import { deleteContact } from "./domain/rpus/delete-contact/delete-contact.js";
import { createBusinessPartner } from "./domain/rpus/create-business-partner/create-business-partner.js";
import { updateBusinessPartner } from "./domain/rpus/update-business-partner/update-business-partner.js";
import { deleteBusinessPartner } from "./domain/rpus/delete-business-partner/delete-business-partner.js";
import { linkContactGp } from "./domain/rpus/link-contact-gp/link-contact-gp.js";
import { unlinkContactGp } from "./domain/rpus/unlink-contact-gp/unlink-contact-gp.js";
import { authenticateUser } from "./domain/rpus/authenticate-user/authenticate-user.js";
import { authenticateApiKey } from "./domain/rpus/authenticate-api-key/authenticate-api-key.js";
import { updateUserProfile } from "./domain/rpus/update-user-profile/update-user-profile.js";
import { generateUserApiKey } from "./domain/rpus/generate-user-api-key/generate-user-api-key.js";
import { deleteUserApiKey } from "./domain/rpus/delete-user-api-key/delete-user-api-key.js";
import { listActiveContacts } from "./domain/rpus/list-active-contacts/list-active-contacts.js";
import { listBusinessPartners } from "./domain/rpus/list-business-partners/list-business-partners.js";
import { listInvoicingData } from "./domain/rpus/list-invoicing-data/list-invoicing-data.js";
import { createInvoiceDraft } from "./domain/rpus/create-invoice-draft/create-invoice-draft.js";
import { updateInvoiceDraft } from "./domain/rpus/update-invoice-draft/update-invoice-draft.js";
import { createPaymentTerm } from "./domain/rpus/create-payment-term/create-payment-term.js";
import { verifyOtp } from "./reactors/verify-otp/verify-otp.js";
import { requestOtp } from "./reactors/request-otp/request-otp.js";
import { select } from "./reactors/select/select.js";
import { DEV_CONTACTS, DEV_BUSINESS_PARTNERS } from "./dev-seed.js";

function usePostgres(): boolean {
  const mode = process.env.PERSISTENCE?.toLowerCase();
  if (mode === "postgres") return true;
  if (mode === "memory") return false;
  return Boolean(process.env.DATABASE_URL);
}

if (!usePostgres()) {
  process.env.EVARO_SHARED_MEMORY_FILE ??= "/tmp/evaro-crm-memory.json";
}

// In-memory providers must be process-wide singletons so state survives across
// requests handled by different local Netlify function modules in the same dev
// process. Module-local variables are not enough there; globalThis is.
interface MemoryProviders {
  contacts?: InMemoryContactsProvider;
  activityLog?: InMemoryActivityLogProvider;
  users?: InMemoryUsersProvider;
  businessPartners?: InMemoryBusinessPartnersProvider;
  contactGps?: InMemoryContactGpsProvider;
  invoices?: InMemoryInvoicesProvider;
  otps?: InMemoryOtpProvider;
}

const memory = ((globalThis as typeof globalThis & { __evaroMemory?: MemoryProviders })
  .__evaroMemory ??= {});

// DEV ONLY: in-memory mode is seeded with sample data so the UI has something to
// show before create flows exist. This must be removed before going to a real
// (Postgres) database. The warning makes an accidental production use obvious.
function warnSeed(): void {
  console.warn(
    "⚠️  DEV SEED aktiv (PERSISTENCE=memory): Beispiel-Daten geladen. Vor Produktiv-DB entfernen (backend/src/dev-seed.ts).",
  );
}

function buildContacts(): ContactsProvider {
  if (usePostgres()) return new PostgresContactsProvider();
  if (!memory.contacts) {
    warnSeed();
    memory.contacts = new InMemoryContactsProvider(DEV_CONTACTS);
  }
  return memory.contacts;
}

function buildBusinessPartners(): BusinessPartnersProvider {
  if (usePostgres()) return new PostgresBusinessPartnersProvider();
  return (memory.businessPartners ??= new InMemoryBusinessPartnersProvider(DEV_BUSINESS_PARTNERS));
}

function buildContactGps(): ContactGpsProvider {
  if (usePostgres()) return new PostgresContactGpsProvider();
  return (memory.contactGps ??= new InMemoryContactGpsProvider());
}

function buildActivityLog(): ActivityLogProvider {
  if (usePostgres()) return new PostgresActivityLogProvider();
  return (memory.activityLog ??= new InMemoryActivityLogProvider());
}

function buildInvoices(): InvoicesProvider {
  if (usePostgres()) return new PostgresInvoicesProvider();
  return (memory.invoices ??= new InMemoryInvoicesProvider());
}

function buildUsers(): UsersProvider {
  if (usePostgres()) return new PostgresUsersProvider();
  return (memory.users ??= new InMemoryUsersProvider());
}

function buildOtps(): OtpProvider {
  if (usePostgres()) return new PostgresOtpProvider();
  return (memory.otps ??= new InMemoryOtpProvider());
}

let tokensSingleton: TokensProvider | undefined;
export function tokens(): TokensProvider {
  if (!tokensSingleton) {
    const secret = process.env.AUTH_JWT_SECRET || process.env.AUTH_SECRET_OTP || "dev-insecure-secret";
    tokensSingleton = new JwtTokensProvider(secret);
  }
  return tokensSingleton;
}

// Assembled capabilities ------------------------------------------------------

export function createContactRpu() {
  return createContact({ contacts: buildContacts(), activityLog: buildActivityLog() });
}

export function updateContactRpu() {
  return updateContact({ contacts: buildContacts(), activityLog: buildActivityLog() });
}

export function deleteContactRpu() {
  return deleteContact({
    contacts: buildContacts(),
    contactGps: buildContactGps(),
    activityLog: buildActivityLog(),
  });
}

export function createBusinessPartnerRpu() {
  return createBusinessPartner({
    businessPartners: buildBusinessPartners(),
    activityLog: buildActivityLog(),
  });
}

export function updateBusinessPartnerRpu() {
  return updateBusinessPartner({
    businessPartners: buildBusinessPartners(),
    activityLog: buildActivityLog(),
  });
}

export function deleteBusinessPartnerRpu() {
  return deleteBusinessPartner({
    businessPartners: buildBusinessPartners(),
    contactGps: buildContactGps(),
    activityLog: buildActivityLog(),
  });
}

export function linkContactGpRpu() {
  return linkContactGp({ contactGps: buildContactGps(), activityLog: buildActivityLog() });
}

export function unlinkContactGpRpu() {
  return unlinkContactGp({ contactGps: buildContactGps(), activityLog: buildActivityLog() });
}

export function selectReactor() {
  return select({
    listActiveContacts: listActiveContacts({ contacts: buildContacts() }),
    listBusinessPartners: listBusinessPartners({ businessPartners: buildBusinessPartners() }),
    contactGps: buildContactGps(),
  });
}

export function verifyOtpReactor() {
  return verifyOtp({
    otps: buildOtps(),
    fallbackOtp: process.env.AUTH_SECRET_OTP,
    authenticateUser: authenticateUser({ users: buildUsers() }),
    tokens: tokens(),
  });
}

export function authenticateUserRpu() {
  return authenticateUser({ users: buildUsers() });
}

export function authenticateApiKeyRpu() {
  return authenticateApiKey({ users: buildUsers() });
}

export function updateUserProfileRpu() {
  return updateUserProfile({ users: buildUsers() });
}

export function generateUserApiKeyRpu() {
  return generateUserApiKey({ users: buildUsers() });
}

export function deleteUserApiKeyRpu() {
  return deleteUserApiKey({ users: buildUsers() });
}

export function listInvoicingDataRpu() {
  return listInvoicingData({
    invoices: buildInvoices(),
    businessPartners: buildBusinessPartners(),
  });
}

export function createInvoiceDraftRpu() {
  return createInvoiceDraft({
    invoices: buildInvoices(),
    businessPartners: buildBusinessPartners(),
    activityLog: buildActivityLog(),
  });
}

export function updateInvoiceDraftRpu() {
  return updateInvoiceDraft({ invoices: buildInvoices() });
}

export function createPaymentTermRpu() {
  return createPaymentTerm({ invoices: buildInvoices() });
}

export function requestOtpReactor() {
  return requestOtp({
    otps: buildOtps(),
    email: new ResendEmailProvider(),
  });
}
