import type { JSONContent } from '@tiptap/core';
import type { MailyConfig, RenderOptions } from './maily';
import { Maily } from './maily';

export async function render(content: JSONContent, config?: MailyConfig & RenderOptions): Promise<string> {
  const { theme, preview, ...rest } = config || {};

  const maily = new Maily(content);
  maily.setPreviewText(preview);
  maily.setTheme(theme || {});

  return maily.render(rest);
}
