import { JSONContent as MailyJSONContent } from '@maily-to/render';
import { LAYOUT_CONTENT_VARIABLE } from '@novu/shared';

import { replaceMailyNodesByCondition } from '../../../shared/helpers/maily-utils';

const placeholderText = 'Dynamic placeholder content';
const contentPlaceholder =
  '<div style="border: 1px dashed #E1E4EA; border-radius: 4px; background: repeating-linear-gradient(-45deg,#F2F5F8,#F2F5F8 4px,#FBFBFB 4px,#FBFBFB 8px); display: flex; justify-content: center; align-items: center; height: 100%; max-height: 140px; padding: 8px;">' +
  `<span style="background: #FFFFFF; border: 1px solid #E1E4EA; border-radius: 4px; padding: 4px 8px; flex; justify-content: center; align-items: center; font-size: 10px; line-height: 1; color: #99A0AE;">${placeholderText}</span>` +
  '</div>';

export const enhanceBodyForPreview = (editorType: string, body: string) => {
  if (editorType === 'html') {
    return body?.replace(new RegExp(`\\{\\{\\s*${LAYOUT_CONTENT_VARIABLE}\\s*\\}\\}`), contentPlaceholder);
  }

  return JSON.stringify(
    replaceMailyNodesByCondition(
      body,
      (node) => node.type === 'variable' && node.attrs?.id === LAYOUT_CONTENT_VARIABLE,
      () =>
        ({
          type: 'section',
          attrs: {
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: '#E1E4EA',
            borderRadius: 4,
            background: 'repeating-linear-gradient(-45deg,#F2F5F8,#F2F5F8 4px,#FBFBFB 4px,#FBFBFB 8px)',
            paddingTop: 8,
            paddingRight: 8,
            paddingBottom: 8,
            paddingLeft: 8,
            height: '100%',
            textAlign: 'center',
            maxHeight: 140,
            showIfKey: null,
          },
          content: [
            {
              type: 'paragraph',
              attrs: {
                background: '#FFFFFF',
                border: '1px solid #E1E4EA',
                borderRadius: 4,
                paddingTop: 4,
                paddingRight: 8,
                paddingBottom: 4,
                paddingLeft: 8,
                fontSize: 10,
                color: '#99A0AE',
                textAlign: 'center',
                display: 'inline',
                showIfKey: null,
              },
              content: [
                {
                  type: 'text',
                  text: placeholderText,
                },
              ],
            },
          ],
        }) satisfies MailyJSONContent
    )
  );
};
