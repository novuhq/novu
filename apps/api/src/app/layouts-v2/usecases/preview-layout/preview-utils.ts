import { JSONContent as MailyJSONContent } from '@maily-to/render';
import { LAYOUT_CONTENT_VARIABLE, LAYOUT_PREVIEW_CONTENT_PLACEHOLDER } from '@novu/shared';

import { replaceMailyNodesByCondition } from '../../../shared/helpers/maily-utils';

export const enhanceBodyForPreview = (editorType: string, body: string) => {
  if (editorType === 'html') {
    return body?.replace(
      new RegExp(`\\{\\{\\s*${LAYOUT_CONTENT_VARIABLE}\\s*\\}\\}`),
      LAYOUT_PREVIEW_CONTENT_PLACEHOLDER
    );
  }

  return JSON.stringify(
    replaceMailyNodesByCondition(
      body,
      (node) => node.type === 'variable' && node.attrs?.id === LAYOUT_CONTENT_VARIABLE,
      (node) => {
        return {
          type: 'text',
          text: LAYOUT_PREVIEW_CONTENT_PLACEHOLDER,
          attrs: {
            ...node.attrs,
            shouldDangerouslySetInnerHTML: true,
          },
        } satisfies MailyJSONContent;
      }
    )
  );
};
