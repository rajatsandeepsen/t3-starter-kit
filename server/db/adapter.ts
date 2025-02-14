import { and, eq } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { Adapter, AdapterAccount, AdapterUser } from 'next-auth/adapters';

import {
  accounts,
  sessions,
  users as user,
  verificationTokens,
} from '@/server/db/schema';

type CustomAdapterUser = AdapterUser;

export function CustomPgDrizzleAdapter(
  db: InstanceType<typeof PgDatabase>
): Adapter {
  return {
    async createUser(userData: CustomAdapterUser) {
      await db.insert(user).values({
        ...userData,
      });
      const rows = await db
        .select()
        .from(user)
        .where(eq(user.email, userData.email))
        .limit(1);
      const row = rows[0];
      if (!row) throw new Error('User not found');
      return row;
    },
    async getUser(id: string) {
      const rows = await db.select().from(user).where(eq(user.id, id)).limit(1);
      const row = rows[0];
      return row ?? null;
    },
    async getUserByEmail(email: string) {
      const rows = await db
        .select()
        .from(user)
        .where(eq(user.email, email))
        .limit(1);
      const row = rows[0];
      return row ?? null;
    },
    async getUserByAccount({
      providerAccountId,
      provider,
    }: { providerAccountId: string; provider: string }) {
      const rows = await db
        .select()
        .from(user)
        .innerJoin(accounts, eq(user.id, accounts.userId))
        .where(
          and(
            eq(accounts.providerAccountId, providerAccountId),
            eq(accounts.provider, provider)
          )
        )
        .limit(1);
      const row = rows[0];
      return row?.user ?? null;
    },
    async updateUser({ id, ...userData }: { id: string }) {
      if (!id) throw new Error('User not found');
      await db.update(user).set(userData).where(eq(user.id, id));
      const rows = await db.select().from(user).where(eq(user.id, id)).limit(1);
      const row = rows[0];
      if (!row) throw new Error('User not found');
      return row;
    },
    async deleteUser(userId: string) {
      await db.delete(user).where(eq(user.id, userId));
    },
    async linkAccount(account: AdapterAccount) {
      await db.insert(accounts).values({
        ...account,
      });
    },
    async unlinkAccount({
      providerAccountId,
      provider,
    }: { providerAccountId: string; provider: string }) {
      await db
        .delete(accounts)
        .where(
          and(
            eq(accounts.providerAccountId, providerAccountId),
            eq(accounts.provider, provider)
          )
        );
    },
    async createSession(data) {
      await db.insert(sessions).values({
        ...data,
      });
      const rows = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, data.sessionToken))
        .limit(1);
      const row = rows[0];
      if (!row) throw new Error('User not found');
      return row;
    },
    async getSessionAndUser(sessionToken: string) {
      const rows = await db
        .select({
          users: user,
          session: {
            ...sessions,
          },
        })
        .from(sessions)
        .innerJoin(user, eq(user.id, sessions.userId))
        .where(eq(sessions.sessionToken, sessionToken))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      const { users, session } = row;
      return {
        user: users,
        session: {
          ...session,
        },
      };
    },
    async updateSession(session) {
      await db
        .update(sessions)
        .set(session)
        .where(eq(sessions.sessionToken, session.sessionToken));
      const rows = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, session.sessionToken))
        .limit(1);
      const row = rows[0];
      if (!row) throw new Error('Coding bug: updated session not found');
      return row;
    },
    async deleteSession(sessionToken: string) {
      await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
    },
    async createVerificationToken(verificationToken) {
      await db.insert(verificationTokens).values({
        ...verificationToken,
      });
      const rows = await db
        .select()
        .from(verificationTokens)
        .where(eq(verificationTokens.token, verificationToken.token))
        .limit(1);
      const row = rows[0];
      if (!row)
        throw new Error('Coding bug: inserted verification token not found');
      return row;
    },
    async useVerificationToken({
      identifier,
      token,
    }: { identifier: string; token: string }) {
      const rows = await db
        .select()
        .from(verificationTokens)
        .where(eq(verificationTokens.token, token))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      await db
        .delete(verificationTokens)
        .where(
          and(
            eq(verificationTokens.token, token),
            eq(verificationTokens.identifier, identifier)
          )
        );
      return row;
    },
  };
}
