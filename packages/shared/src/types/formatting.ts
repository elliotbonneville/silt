/**
 * Formatting and theme types for client customization
 */

import { z } from 'zod';

export const ThemePresetSchema = z.enum(['classic', 'modern', 'dark', 'light', 'custom']);
export type ThemePreset = z.infer<typeof ThemePresetSchema>;

export const FONT_FAMILY_KEYS = [
  'courier-new',
  'source-code-pro',
  'ibm-plex-mono',
  'fira-code',
  'inter',
  'roboto',
  'open-sans',
  'lora',
  'merriweather',
] as const;

export const FontFamilySchema = z.enum(FONT_FAMILY_KEYS);
export type FontFamily = z.infer<typeof FontFamilySchema>;

export const ThemeColorsSchema = z.object({
  background: z.string(),
  text: z.string(),
  roomDescription: z.string(),
  movement: z.string(),
  speech: z.string(),
  combat: z.string(),
  death: z.string(),
  item: z.string(),
  ambient: z.string(),
  system: z.string(),
});
export type ThemeColors = z.infer<typeof ThemeColorsSchema>;

export const FormattingPreferencesSchema = z.object({
  themePreset: ThemePresetSchema,
  fontFamily: FontFamilySchema,
  fontSize: z.number().int().min(12).max(20),
  lineWidth: z.number().int().min(60).max(120),
  customColors: ThemeColorsSchema.partial().optional(),
});
export type FormattingPreferences = z.infer<typeof FormattingPreferencesSchema>;

/**
 * Predefined theme presets
 */
export const THEME_PRESETS: Record<ThemePreset, ThemeColors> = {
  classic: {
    background: '#1a1a1a',
    text: '#00ff00',
    roomDescription: '#00ffff',
    movement: '#ffff00',
    speech: '#ffffff',
    combat: '#ff4444',
    death: '#cc0000',
    item: '#4444ff',
    ambient: '#888888',
    system: '#00ff00',
  },
  modern: {
    background: '#0f172a',
    text: '#cbd5e1',
    roomDescription: '#38bdf8',
    movement: '#fbbf24',
    speech: '#f8fafc',
    combat: '#f87171',
    death: '#dc2626',
    item: '#818cf8',
    ambient: '#64748b',
    system: '#94a3b8',
  },
  dark: {
    background: '#000000',
    text: '#e0e0e0',
    roomDescription: '#60a5fa',
    movement: '#facc15',
    speech: '#f5f5f5',
    combat: '#ef4444',
    death: '#991b1b',
    item: '#8b5cf6',
    ambient: '#737373',
    system: '#a3a3a3',
  },
  light: {
    background: '#ffffff',
    text: '#1f2937',
    roomDescription: '#0284c7',
    movement: '#ca8a04',
    speech: '#111827',
    combat: '#b91c1c',
    death: '#7f1d1d',
    item: '#6366f1',
    ambient: '#6b7280',
    system: '#374151',
  },
  custom: {
    background: '#1a1a1a',
    text: '#00ff00',
    roomDescription: '#00ffff',
    movement: '#ffff00',
    speech: '#ffffff',
    combat: '#ff4444',
    death: '#cc0000',
    item: '#4444ff',
    ambient: '#888888',
    system: '#00ff00',
  },
};

/**
 * Font family mappings with Google Fonts
 */
export const FONT_FAMILIES: Record<FontFamily, { family: string; category: string }> = {
  'courier-new': {
    family: "'Courier New', 'Courier', monospace",
    category: 'Monospace',
  },
  'source-code-pro': {
    family: "'Source Code Pro', 'Courier New', monospace",
    category: 'Monospace',
  },
  'ibm-plex-mono': {
    family: "'IBM Plex Mono', 'Courier New', monospace",
    category: 'Monospace',
  },
  'fira-code': {
    family: "'Fira Code', 'Courier New', monospace",
    category: 'Monospace',
  },
  inter: {
    family: "'Inter', system-ui, sans-serif",
    category: 'Sans-Serif',
  },
  roboto: {
    family: "'Roboto', system-ui, sans-serif",
    category: 'Sans-Serif',
  },
  'open-sans': {
    family: "'Open Sans', system-ui, sans-serif",
    category: 'Sans-Serif',
  },
  lora: {
    family: "'Lora', 'Georgia', serif",
    category: 'Serif',
  },
  merriweather: {
    family: "'Merriweather', 'Georgia', serif",
    category: 'Serif',
  },
};

export const FONT_DISPLAY_NAMES: Record<FontFamily, string> = {
  'courier-new': 'Courier New',
  'source-code-pro': 'Source Code Pro',
  'ibm-plex-mono': 'IBM Plex Mono',
  'fira-code': 'Fira Code',
  inter: 'Inter',
  roboto: 'Roboto',
  'open-sans': 'Open Sans',
  lora: 'Lora',
  merriweather: 'Merriweather',
};
