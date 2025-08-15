import type { Theme } from '../types';

export const dark: Theme = {
  variables: {
    colorNeutral: 'white',
    colorBackground: '#1A1A1A',
    colorForeground: '#EDEDEF',
    colorSecondary: '#383838',
    colorSecondaryForeground: '#EDEDEF',
    colorShadow: 'black',
    colorRing: '#E1E4EA',
    colorStripes: '#FF8447',
  },
  elements: {
    severityHigh__bellContainer:
      '[--bell-gradient-start:var(--nv-color-severity-high)] [--bell-gradient-end:oklch(from_var(--nv-color-severity-high)_80%_c_h)]',
    severityMedium__bellContainer:
      '[--bell-gradient-start:var(--nv-color-severity-medium)] [--bell-gradient-end:oklch(from_var(--nv-color-severity-medium)_80%_c_h)]',
    severityLow__bellContainer:
      '[--bell-gradient-start:var(--nv-color-severity-low)] [--bell-gradient-end:oklch(from_var(--nv-color-severity-low)_80%_c_h)]',
    bellContainer:
      '[--bell-gradient-start:var(--nv-color-foreground)] [--bell-gradient-end:oklch(from_var(--nv-color-foreground)_80%_c_h)]',
    severityGlowHigh__bellSeverityGlow: 'nt-bg-severity-high-alpha-300 before:nt-bg-severity-high-alpha-300',
    severityGlowMedium__bellSeverityGlow: 'nt-bg-severity-medium-alpha-300 before:nt-bg-severity-medium-alpha-300',
    severityGlowLow__bellSeverityGlow: 'nt-bg-severity-low-alpha-300 before:nt-bg-severity-low-alpha-300',
    bellSeverityGlow: 'nt-bg-severity-none-alpha-300 before:nt-bg-severity-none-alpha-300',
  },
};
