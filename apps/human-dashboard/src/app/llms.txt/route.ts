import { llmsIndex } from '@/lib/home-markdown';

export const dynamic = 'force-static';

export function GET() {
  return new Response(llmsIndex(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
