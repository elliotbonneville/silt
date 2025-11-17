/**
 * Account data access layer - manages account queries and updates
 */

import type { FormattingPreferences } from '@silt/shared';
import {
  FontFamilySchema,
  FormattingPreferencesSchema,
  ThemeColorsSchema,
  ThemePresetSchema,
} from '@silt/shared';
import { prisma } from './client.js';

/**
 * Find account by username
 */
export async function findAccountByUsername(username: string) {
  return await prisma.account.findUnique({
    where: { username },
  });
}

/**
 * Find account by ID
 */
export async function findAccountById(id: string) {
  return await prisma.account.findUnique({
    where: { id },
  });
}

/**
 * Find or create account by username
 */
export async function findOrCreateAccount(username: string) {
  let account = await prisma.account.findUnique({
    where: { username },
  });

  if (!account) {
    account = await prisma.account.create({
      data: { username },
    });
  }

  return account;
}

/**
 * Get account formatting preferences
 */
export async function getAccountPreferences(accountId: string): Promise<FormattingPreferences> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      themePreset: true,
      fontFamily: true,
      fontSize: true,
      lineWidth: true,
      customColorsJson: true,
    },
  });

  if (!account) {
    throw new Error('Account not found');
  }

  // Parse and validate custom colors
  let customColors: FormattingPreferences['customColors'];
  try {
    const parsed: unknown = JSON.parse(account.customColorsJson);
    const result = ThemeColorsSchema.partial().safeParse(parsed);
    if (result.success) {
      customColors = result.data;
    }
  } catch {
    customColors = undefined;
  }

  // Validate theme preset and font family
  const themePresetResult = ThemePresetSchema.safeParse(account.themePreset);
  const fontFamilyResult = FontFamilySchema.safeParse(account.fontFamily);

  // Build preferences with validated values or defaults
  const preferences: FormattingPreferences = {
    themePreset: themePresetResult.success ? themePresetResult.data : 'classic',
    fontFamily: fontFamilyResult.success ? fontFamilyResult.data : 'courier-new',
    fontSize: account.fontSize,
    lineWidth: account.lineWidth,
    customColors,
  };

  // Validate the complete object
  return FormattingPreferencesSchema.parse(preferences);
}

/**
 * Update account formatting preferences
 */
export async function updateAccountPreferences(
  accountId: string,
  preferences: Partial<FormattingPreferences>,
): Promise<FormattingPreferences> {
  const updateData: {
    themePreset?: string;
    fontFamily?: string;
    fontSize?: number;
    lineWidth?: number;
    customColorsJson?: string;
  } = {};

  if (preferences.themePreset) {
    updateData.themePreset = preferences.themePreset;
  }

  if (preferences.fontFamily) {
    updateData.fontFamily = preferences.fontFamily;
  }

  if (typeof preferences.fontSize === 'number') {
    updateData.fontSize = Math.max(12, Math.min(20, preferences.fontSize));
  }

  if (typeof preferences.lineWidth === 'number') {
    updateData.lineWidth = Math.max(60, Math.min(120, preferences.lineWidth));
  }

  if (preferences.customColors) {
    updateData.customColorsJson = JSON.stringify(preferences.customColors);
  }

  await prisma.account.update({
    where: { id: accountId },
    data: updateData,
  });

  return await getAccountPreferences(accountId);
}
