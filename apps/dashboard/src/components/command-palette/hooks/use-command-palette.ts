import { useCommandPaletteContext } from '../command-palette-provider';

export function useCommandPalette() {
  return useCommandPaletteContext();
}
