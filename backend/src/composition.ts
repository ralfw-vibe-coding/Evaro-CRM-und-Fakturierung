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

import { JwtTokensProvider } from "./shell/xproviders/tokens/jwt-tokens-provider.js";
import type { TokensProvider } from "./shell/xproviders/tokens/tokens-provider.js";

import { createContact } from "./domain/rpus/create-contact/create-contact.js";
import { authenticateUser } from "./domain/rpus/authenticate-user/authenticate-user.js";
import { verifyOtp } from "./reactors/verify-otp/verify-otp.js";

function usePostgres(): boolean {
  const mode = process.env.PERSISTENCE?.toLowerCase();
  if (mode === "postgres") return true;
  if (mode === "memory") return false;
  return Boolean(process.env.DATABASE_URL);
}

// In-memory providers must be process-wide singletons so state survives across
// requests handled by the same warm function instance.
let memoryContacts: InMemoryContactsProvider | undefined;
let memoryActivityLog: InMemoryActivityLogProvider | undefined;
let memoryUsers: InMemoryUsersProvider | undefined;

function buildContacts(): ContactsProvider {
  if (usePostgres()) return new PostgresContactsProvider();
  return (memoryContacts ??= new InMemoryContactsProvider());
}

function buildActivityLog(): ActivityLogProvider {
  if (usePostgres()) return new PostgresActivityLogProvider();
  return (memoryActivityLog ??= new InMemoryActivityLogProvider());
}

function buildUsers(): UsersProvider {
  if (usePostgres()) return new PostgresUsersProvider();
  return (memoryUsers ??= new InMemoryUsersProvider());
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

export function verifyOtpReactor() {
  return verifyOtp({
    acceptedOtp: process.env.AUTH_SECRET_OTP ?? "",
    authenticateUser: authenticateUser({ users: buildUsers() }),
    tokens: tokens(),
  });
}
