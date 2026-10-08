/** Letters of the codes `human login` prints (`CLI_USER_CODE_ALPHABET` in `@novu/shared`). */
const USER_CODE_LETTERS = /^[BCDFGHJKLMNPQRSTVWXZ]{8}$/;

/**
 * The code as the CLI prints it (`BCDF-GHJK`), however it was typed or linked: any case, with or without
 * the dash or spaces. Null for anything that isn't a code, so nothing else is ever sent on or shown as one.
 */
export function normalizeUserCode(input: string): string | null {
  const letters = input.toUpperCase().replace(/[^A-Z]/g, '');

  return USER_CODE_LETTERS.test(letters) ? `${letters.slice(0, 4)}-${letters.slice(4)}` : null;
}
