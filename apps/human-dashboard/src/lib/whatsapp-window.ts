/** Whether WhatsApp's 24-hour window lets a message through to a contact right now, as the API reads it. */
export type WhatsAppWindow = {
  open: boolean;
  /** When they last wrote to the business number. */
  lastMessageAt?: string;
  /** When the window shuts, or shut: 24 hours after their last message. */
  closesAt?: string;
};

/**
 * The window in words, short enough for a contact's channel line: "open until 14:32" (with the day when that's not
 * today), or "closed" once it shut, since only their next message opens it again.
 */
export function describeWhatsAppWindow(
  window: WhatsAppWindow,
  now: Date = new Date(),
  locale?: string
): { open: boolean; label: string; detail: string } {
  const closesAt = window.closesAt ? new Date(window.closesAt) : undefined;

  if (!window.open || !closesAt || closesAt.getTime() <= now.getTime()) {
    return {
      open: false,
      label: 'window closed',
      detail: 'WhatsApp can’t write to them until they write to you again.',
    };
  }

  const time = closesAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const sameDay = closesAt.toDateString() === now.toDateString();
  const until = sameDay ? time : `${closesAt.toLocaleDateString(locale, { weekday: 'short' })} ${time}`;

  return {
    open: true,
    label: `open until ${until}`,
    detail: `WhatsApp can write to them until ${until}, 24 hours after their last message.`,
  };
}
