type DialogMarkProps = {
  /** A check for something that worked, an exclamation mark for a warning, a key for the API key. */
  glyph: 'check' | 'warning' | 'key';
};

/**
 * The Figma illustrations `Illustration/state-success`, `Illustration/state-error` and
 * `Illustration/empty-keys`, exported as they are.
 */
const SOURCES: Record<DialogMarkProps['glyph'], string> = {
  check: '/illustrations/state-success.svg',
  warning: '/illustrations/state-error.svg',
  key: '/illustrations/empty-keys.svg',
};

/** The dotted, glowing mark above a dialog's title. */
export function DialogMark({ glyph }: DialogMarkProps) {
  return <img src={SOURCES[glyph]} alt="" width={56} height={56} className="size-14 shrink-0 self-start" />;
}
