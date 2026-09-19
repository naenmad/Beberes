export interface AccentColor {
  id: string;
  nameKey: string;
  hex: string;
  hover: string;
  rgb: string;
}

export interface AccentPreset {
  id: string;
  nameKey: string;
  primary: string;
  secondary: string;
}

export const ACCENT_COLORS: AccentColor[] = [
  {
    id: 'blue',
    nameKey: 'settings.colors.blue',
    hex: '#0071e3',
    hover: '#0077ed',
    rgb: '0, 113, 227',
  },
  {
    id: 'indigo',
    nameKey: 'settings.colors.indigo',
    hex: '#6366f1',
    hover: '#4f46e5',
    rgb: '99, 102, 241',
  },
  {
    id: 'purple',
    nameKey: 'settings.colors.purple',
    hex: '#8b5cf6',
    hover: '#7c3aed',
    rgb: '139, 92, 246',
  },
  {
    id: 'cyan',
    nameKey: 'settings.colors.cyan',
    hex: '#0ea5e9',
    hover: '#0284c7',
    rgb: '14, 165, 233',
  },
  {
    id: 'emerald',
    nameKey: 'settings.colors.emerald',
    hex: '#10b981',
    hover: '#059669',
    rgb: '16, 185, 129',
  },
  {
    id: 'amber',
    nameKey: 'settings.colors.amber',
    hex: '#f59e0b',
    hover: '#d97706',
    rgb: '245, 158, 11',
  },
  {
    id: 'rose',
    nameKey: 'settings.colors.rose',
    hex: '#f43f5e',
    hover: '#e11d48',
    rgb: '244, 63, 94',
  },
  {
    id: 'slate',
    nameKey: 'settings.colors.slate',
    hex: '#64748b',
    hover: '#475569',
    rgb: '100, 116, 139',
  },
];

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: 'apple-classic',
    nameKey: 'settings.colors.presets.appleClassic',
    primary: 'blue',
    secondary: 'indigo',
  },
  {
    id: 'cyber-purple',
    nameKey: 'settings.colors.presets.cyberPurple',
    primary: 'purple',
    secondary: 'cyan',
  },
  {
    id: 'emerald-garden',
    nameKey: 'settings.colors.presets.emeraldGarden',
    primary: 'emerald',
    secondary: 'cyan',
  },
  {
    id: 'sunset-glow',
    nameKey: 'settings.colors.presets.sunsetGlow',
    primary: 'rose',
    secondary: 'amber',
  },
  {
    id: 'clean-slate',
    nameKey: 'settings.colors.presets.cleanSlate',
    primary: 'slate',
    secondary: 'blue',
  },
];

export function getAccentColor(id: string): AccentColor {
  const match = ACCENT_COLORS.find((c) => c.id === id);
  return match || ACCENT_COLORS[0];
}

export function applyThemeColors(primaryId: string, secondaryId: string): void {
  if (typeof document === 'undefined') return;

  const primary = getAccentColor(primaryId);
  const secondary = getAccentColor(secondaryId);

  const root = document.documentElement;
  root.style.setProperty('--theme-accent', primary.hex);
  root.style.setProperty('--theme-accent-hover', primary.hover);
  root.style.setProperty('--theme-accent-rgb', primary.rgb);

  root.style.setProperty('--theme-secondary', secondary.hex);
  root.style.setProperty('--theme-secondary-hover', secondary.hover);
  root.style.setProperty('--theme-secondary-rgb', secondary.rgb);
}
