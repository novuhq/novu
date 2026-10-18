import type { Screen } from './screen';

let opened: Screen | null = null;

/**
 * The screen the running command has open, if any. While there is one, everything the command says through
 * the shared helpers (`info`, `promptLine`, `startWaitIndicator`...) goes into it instead of onto the terminal
 * below it, so commands built from those helpers need no changes to use it.
 */
export function openedScreen(): Screen | null {
  return opened;
}

export function setOpenedScreen(screen: Screen | null): void {
  opened = screen;
}
