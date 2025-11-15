/**
 * Account repository - database operations for accounts
 */

import type { Account } from '@prisma/client';
import { prisma } from './client.js';

/**
 * Find or create an account by username
 * For Iteration 1, this auto-creates accounts (no password)
 */
export async function findOrCreateAccount(username: string): Promise<Account> {
  // Try to find existing account
  let account = await prisma.account.findUnique({
    where: { username },
  });

  // Create if doesn't exist
  if (!account) {
    account = await prisma.account.create({
      data: { username },
    });
  }

  return account;
}

/**
 * Find account by ID
 */
export async function findAccountById(id: string): Promise<Account | null> {
  return await prisma.account.findUnique({
    where: { id },
  });
}

/**
 * Find account by username
 */
export async function findAccountByUsername(username: string): Promise<Account | null> {
  return await prisma.account.findUnique({
    where: { username },
  });
}
