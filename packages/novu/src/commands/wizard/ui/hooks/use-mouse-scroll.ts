import { useStdin, useStdout } from 'ink';
import { useEffect, useRef } from 'react';

/**
 * Mouse-wheel scroll support for Ink-based TUIs via SGR extended mouse reporting
 * (xterm "1006" mode). Works on iTerm2, Terminal.app, Ghostty, VS Code terminal,
 * Windows Terminal, Alacritty, and tmux (when `set -g mouse on` is configured).
 *
 * Why we roll our own:
 * - We only need wheel events (not click/hover/drag/position), so a small
 *   focused parser is far cheaper than another peer dependency that needs to
 *   play nice with the CJS→ESM bundling we already do for the Ink subtree.
 * - Mouse mode is enabled/disabled lazily via refcounting so multiple consumers
 *   (e.g. transcript + errors overlay) cooperate cleanly.
 * - We patch `stdin.read()` so mouse escape sequences are *consumed* before
 *   they reach Ink's input parser. Ink 7 reads stdin in pull mode (via the
 *   `'readable'` event + `stdin.read()`), so observing `'data'` events isn't
 *   enough — the leftover bytes (`[<64;36;18M`) would otherwise leak into
 *   `useInput` as printable input and end up in the composer buffer.
 *
 * Caveat: when mouse mode is enabled, native click-and-drag text selection is
 * captured by the app. Holding Option (iTerm2/Terminal.app) or Shift (Windows
 * Terminal/Alacritty) bypasses it and restores normal terminal selection.
 */
export interface MouseScrollEvent {
  direction: 'up' | 'down';
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  x: number;
  y: number;
}

interface UseMouseScrollOptions {
  isActive?: boolean;
  onScroll: (event: MouseScrollEvent) => void;
}

const ESC = String.fromCharCode(0x1b);
const ENABLE_SEQUENCE = `${ESC}[?1000h${ESC}[?1006h`;
const DISABLE_SEQUENCE = `${ESC}[?1006l${ESC}[?1000l`;
// Matches SGR mouse press/release: ESC[<button;x;y(M|m)
const SGR_MOUSE_GLOBAL_RE = new RegExp(`${ESC}\\[<(\\d+);(\\d+);(\\d+)([Mm])`, 'g');

const WHEEL_UP_BUTTON = 64;
const WHEEL_DOWN_BUTTON = 65;
const MODIFIER_MASK = 0x1c;
const MODIFIER_SHIFT = 0x04;
const MODIFIER_ALT = 0x08;
const MODIFIER_CTRL = 0x10;

type Subscriber = (event: MouseScrollEvent) => void;

// biome-ignore lint/suspicious/noExplicitAny: stdin.read has multiple overloaded signatures
type ReadFn = (size?: number) => any;

let activeHookCount = 0;
let stdoutHandle: NodeJS.WriteStream | undefined;
let stdinHandle: NodeJS.ReadStream | undefined;
let originalRead: ReadFn | undefined;
const subscribers = new Set<Subscriber>();
let exitHandlerRegistered = false;

function dispatchMouseFromChunk(str: string): void {
  SGR_MOUSE_GLOBAL_RE.lastIndex = 0;
  let match: RegExpExecArray | null = SGR_MOUSE_GLOBAL_RE.exec(str);
  while (match !== null) {
    if (match[4] === 'M') {
      const button = Number(match[1]);
      const base = button & ~MODIFIER_MASK;
      if (base === WHEEL_UP_BUTTON || base === WHEEL_DOWN_BUTTON) {
        const event: MouseScrollEvent = {
          direction: base === WHEEL_UP_BUTTON ? 'up' : 'down',
          shift: (button & MODIFIER_SHIFT) !== 0,
          alt: (button & MODIFIER_ALT) !== 0,
          ctrl: (button & MODIFIER_CTRL) !== 0,
          x: Number(match[2]) - 1,
          y: Number(match[3]) - 1,
        };
        for (const sub of subscribers) sub(event);
      }
    }
    match = SGR_MOUSE_GLOBAL_RE.exec(str);
  }
}

function stripMouseSequences(str: string): string {
  return str.replace(SGR_MOUSE_GLOBAL_RE, '');
}

function ensureEnabled(stdout: NodeJS.WriteStream, stdin: NodeJS.ReadStream): void {
  if (activeHookCount === 0) {
    stdout.write(ENABLE_SEQUENCE);
    stdoutHandle = stdout;
    stdinHandle = stdin;

    const baseRead = stdin.read.bind(stdin) as ReadFn;
    originalRead = baseRead;
    const wrappedRead: ReadFn = (size?: number) => {
      const result = size === undefined ? baseRead() : baseRead(size);
      if (result === null || result === undefined) return result;

      const isBuffer = Buffer.isBuffer(result);
      const str = isBuffer ? (result as Buffer).toString('utf8') : String(result);
      if (!str.includes(`${ESC}[<`)) return result;

      dispatchMouseFromChunk(str);
      const cleaned = stripMouseSequences(str);
      if (cleaned.length === str.length) return result;

      return isBuffer ? Buffer.from(cleaned, 'utf8') : cleaned;
    };
    (stdin as unknown as { read: ReadFn }).read = wrappedRead;

    if (!exitHandlerRegistered) {
      exitHandlerRegistered = true;
      const cleanup = () => {
        if (activeHookCount > 0) {
          stdoutHandle?.write(DISABLE_SEQUENCE);
          activeHookCount = 0;
        }
      };
      process.on('exit', cleanup);
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
    }
  }
  activeHookCount += 1;
}

function ensureDisabled(): void {
  activeHookCount = Math.max(0, activeHookCount - 1);
  if (activeHookCount === 0) {
    if (stdinHandle && originalRead) {
      (stdinHandle as unknown as { read: ReadFn }).read = originalRead;
    }
    stdoutHandle?.write(DISABLE_SEQUENCE);
    stdoutHandle = undefined;
    stdinHandle = undefined;
    originalRead = undefined;
  }
}

export function useMouseScroll({ isActive = true, onScroll }: UseMouseScrollOptions): void {
  const { stdout } = useStdout();
  const { stdin, isRawModeSupported } = useStdin();
  const onScrollRef = useRef(onScroll);

  useEffect(() => {
    onScrollRef.current = onScroll;
  }, [onScroll]);

  useEffect(() => {
    if (!isActive) return;
    if (!isRawModeSupported) return;
    if (!stdout || !stdin) return;

    const subscriber: Subscriber = (event) => onScrollRef.current(event);
    subscribers.add(subscriber);
    ensureEnabled(stdout, stdin);

    return () => {
      subscribers.delete(subscriber);
      ensureDisabled();
    };
  }, [isActive, stdout, stdin, isRawModeSupported]);
}
