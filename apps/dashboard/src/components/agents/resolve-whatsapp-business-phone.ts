/**
 * Prefer Meta's human-readable `display_phone_number` from token validation.
 * `phoneNumberIdentification` is Meta's opaque Phone Number ID — use it to look up the
 * display phone, never as the dialable copy target itself.
 */
export function resolveWhatsAppBusinessPhoneDisplay(input: { displayPhoneNumber?: string | null }): string | undefined {
  const display = input.displayPhoneNumber?.trim();

  if (display) {
    return display;
  }

  return undefined;
}
