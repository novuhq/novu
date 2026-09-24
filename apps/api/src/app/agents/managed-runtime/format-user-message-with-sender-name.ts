export function formatUserMessageWithSenderName(content: string, senderName?: string | null): string {
  const trimmedName = senderName?.trim();

  if (!trimmedName || !content) {
    return content;
  }

  return `${trimmedName}: ${content}`;
}
