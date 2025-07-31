import * as parserLiquid from '@shopify/prettier-plugin-liquid/standalone';
import * as parserHtml from 'prettier/plugins/html';
import { format } from 'prettier/standalone';

export const formatHtml = (html: string) => {
  return format(html, {
    parser: 'liquid-html',
    printWidth: 120,
    tabWidth: 2,
    useTabs: false,
    htmlWhitespaceSensitivity: 'css',
    plugins: [parserHtml, parserLiquid],
  });
};
