import { findCurrentUser } from '@/lib/auth-page';
import { readHumanAccount } from '@/lib/human-account';
import { renderShareImage } from '@/lib/share-image';
import { loadOwnShareImage } from '@/lib/share-image-data';

/**
 * The signed-in operator's agent card as a share image (`SHARE_IMAGE_PATH`): what the Share dialog previews
 * and what Download image saves. It shows the card as the Configure page does, so it is never cached for
 * anyone else, and drawn afresh each time the dialog opens.
 */
export async function GET() {
  const user = await findCurrentUser();
  const account = user && readHumanAccount(user);
  if (!user || !account) {
    return new Response('Sign in to see your agent’s card.', { status: 401 });
  }

  const card = await loadOwnShareImage(account, user);
  if (!card) {
    return new Response('There is no agent to share yet.', { status: 404 });
  }

  return renderShareImage(card, { 'cache-control': 'private, no-store' });
}
