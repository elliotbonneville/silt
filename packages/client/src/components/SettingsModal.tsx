/**
 * Settings modal for formatting preferences
 */

import type { FontFamily, FormattingPreferences, ThemePreset } from '@silt/shared';
import {
  FONT_DISPLAY_NAMES,
  FONT_FAMILIES,
  FONT_FAMILY_KEYS,
  FontFamilySchema,
  THEME_PRESETS,
  ThemePresetSchema,
} from '@silt/shared';
import { useState } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: FormattingPreferences;
  onSave: (preferences: Partial<FormattingPreferences>) => Promise<void>;
}

export function SettingsModal({
  isOpen,
  onClose,
  preferences,
  onSave,
}: SettingsModalProps): JSX.Element | null {
  const [themePreset, setThemePreset] = useState<ThemePreset>(preferences.themePreset);
  const [fontFamily, setFontFamily] = useState(preferences.fontFamily);
  const [fontSize, setFontSize] = useState(preferences.fontSize);
  const [lineWidth, setLineWidth] = useState(preferences.lineWidth);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      await onSave({ themePreset, fontFamily, fontSize, lineWidth });
      onClose();
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Group fonts by category
  const fontsByCategory: Record<string, FontFamily[]> = {};
  for (const fontKey of FONT_FAMILY_KEYS) {
    const { category } = FONT_FAMILIES[fontKey];
    if (!fontsByCategory[category]) {
      fontsByCategory[category] = [];
    }
    fontsByCategory[category].push(fontKey);
  }

  const getPreviewTheme = () => {
    return THEME_PRESETS[themePreset];
  };

  const theme = getPreviewTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-gray-800 p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-green-400">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Theme Preset */}
          <div>
            <label htmlFor="theme" className="mb-2 block text-sm font-medium text-gray-300">
              Theme
            </label>
            <select
              id="theme"
              value={themePreset}
              onChange={(e) => {
                const result = ThemePresetSchema.safeParse(e.target.value);
                if (result.success) {
                  setThemePreset(result.data);
                }
              }}
              className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white"
            >
              <option value="classic">Classic (Green on Black)</option>
              <option value="modern">Modern (Blue/Gray)</option>
              <option value="dark">Dark (Clean Black)</option>
              <option value="light">Light (Paper White)</option>
            </select>
          </div>

          {/* Font Family */}
          <div>
            <label htmlFor="font" className="mb-2 block text-sm font-medium text-gray-300">
              Font
            </label>
            <select
              id="font"
              value={fontFamily}
              onChange={(e) => {
                const result = FontFamilySchema.safeParse(e.target.value);
                if (result.success) {
                  setFontFamily(result.data);
                }
              }}
              className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white"
              style={{ fontFamily: FONT_FAMILIES[fontFamily].family }}
            >
              {Object.entries(fontsByCategory).map(([category, fonts]) => (
                <optgroup key={category} label={category}>
                  {fonts.map((font) => (
                    <option
                      key={font}
                      value={font}
                      style={{ fontFamily: FONT_FAMILIES[font].family }}
                    >
                      {FONT_DISPLAY_NAMES[font]}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div>
            <label htmlFor="fontSize" className="mb-2 block text-sm font-medium text-gray-300">
              Font Size: {fontSize}px
            </label>
            <input
              id="fontSize"
              type="range"
              min="12"
              max="20"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-green-600"
            />
          </div>

          {/* Line Width */}
          <div>
            <label htmlFor="lineWidth" className="mb-2 block text-sm font-medium text-gray-300">
              Text Width: {lineWidth} characters
            </label>
            <input
              id="lineWidth"
              type="range"
              min="60"
              max="120"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-full accent-green-600"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>Narrow</span>
              <span>Wide</span>
            </div>
          </div>

          {/* Preview */}
          <div>
            <div className="mb-2 text-sm font-medium text-gray-300">Preview</div>
            <div
              className="rounded border border-gray-600 p-4"
              style={{
                backgroundColor: theme.background,
                color: theme.text,
                fontFamily: FONT_FAMILIES[fontFamily].family,
                fontSize: `${fontSize}px`,
                maxWidth: `${lineWidth}ch`,
              }}
            >
              <div style={{ color: theme.roomDescription }} className="font-bold">
                The Grand Hall
              </div>
              <div>A majestic hall with vaulted ceilings.</div>
              <div style={{ color: theme.movement }}>You move north.</div>
              <div style={{ color: theme.speech }}>Alice says: "Hello!"</div>
              <div style={{ color: theme.combat }}>You attack the goblin for 15 damage!</div>
              <div style={{ color: theme.ambient }}>You hear sounds in the distance.</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
