import type { Root } from 'chat';
import type { CardNode } from './card-renderer.js';
import { extractTextFromCard, renderCard } from './card-renderer.js';
import { EmailFormatConverter } from './format-converter.js';

interface RenderInput {
  text?: string;
  formatted?: Root;
  card?: CardNode;
}

interface RenderOutput {
  html: string;
  text: string;
}

const converter = new EmailFormatConverter();

export async function renderMessage(input: RenderInput): Promise<RenderOutput> {
  if (input.card) {
    const html = await renderCard(input.card);
    const text = extractTextFromCard(input.card) || input.text || '';

    return { html, text };
  }

  if (input.formatted) {
    const html = converter.fromAst(input.formatted);
    const text = input.text || stripForText(html);

    return { html, text };
  }

  const text = input.text || '';
  const html = `<pre style="font-family:inherit;white-space:pre-wrap;">${escapeHtml(text)}</pre>`;

  return { html, text };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripForText(html: string): string {
  return html.replace(/<[^<>]*>/g, '').replace(/[<>]/g, '').trim();
}
