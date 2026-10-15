import { toast } from '@/components/ui/toast';

/** Until the Share dialog exists (NV-9035), sharing the card means copying its link. */
export async function shareCard(handle: string, cardLink: string) {
  const url = `https://${cardLink}`;

  try {
    await navigator.clipboard.writeText(url);
    toast(`Copied the link to ${handle}’s card`);
  } catch {
    toast(`Couldn't copy. The link is: ${url}`, 'error');
  }
}
