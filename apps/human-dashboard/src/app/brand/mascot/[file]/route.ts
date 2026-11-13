import {
  allMascotPictures,
  MASCOT_PICTURE_TYPES,
  mascotPictureName,
  mascotPictureOf,
  renderMascotPicture,
} from '@/lib/mascot-picture';

/** Only the pictures listed below exist: any other name is a 404, and nothing is ever drawn for a visitor. */
export const dynamicParams = false;

/** Every body in every colour, as a PNG and as a JPEG: drawn once, when the site is built. */
export function generateStaticParams(): Array<{ file: string }> {
  return allMascotPictures().map((picture) => ({ file: mascotPictureName(picture) }));
}

/**
 * The mascot in one look, as a channel shows it for an agent with no picture of its own
 * (`/brand/mascot/drop-coral.png`): see `mascot-picture.ts`. Emails, Slack and Telegram load it from here, next to
 * the default picture in `public/brand`.
 */
export async function GET(_request: Request, { params }: RouteContext<'/brand/mascot/[file]'>) {
  const { file } = await params;
  const picture = mascotPictureOf(file);
  if (!picture) {
    return new Response('There is no such picture.', { status: 404 });
  }

  const body = await renderMascotPicture(picture);

  return new Response(new Uint8Array(body), {
    headers: {
      'content-type': MASCOT_PICTURE_TYPES[picture.format],
      // As long as the files in `public/brand` are kept: a redrawn mascot shows within a day.
      'cache-control': 'public, max-age=86400',
    },
  });
}
