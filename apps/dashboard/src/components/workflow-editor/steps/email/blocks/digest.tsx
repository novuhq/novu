import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { BlockItem } from '@maily-to/core/blocks';
import { StepResponseDto } from '@novu/shared';
import { RiShadowLine } from 'react-icons/ri';

export const createDigestBlock = (props: {
  track: ReturnType<typeof useTelemetry>;
  digestStepBeforeCurrent: StepResponseDto;
}): BlockItem => {
  const { track, digestStepBeforeCurrent } = props;

  const maxIterations = 5;

  return {
    title: 'Digest block',
    description: 'Display digested notifications in list.',
    searchTerms: ['digest', 'notification'],
    icon: <RiShadowLine className="mly-h-4 mly-w-4" />,
    preview: '/images/email-editor/digest-block-preview.webp',
    command: ({ editor, range }) => {
      track(TelemetryEvent.DIGEST_BLOCK_ADDED, {
        type: 'digest',
      });

      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'section',
          attrs: { showIfKey: null, backgroundColor: '#FFFFFF', borderWidth: 0 },
          content: [
            {
              type: 'repeat',
              attrs: {
                each: `steps.${digestStepBeforeCurrent.stepId}.events`,
                isUpdatingKey: false,
                showIfKey: null,
                iterations: maxIterations,
              },
              content: [
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: null,
                    showIfKey: null,
                  },
                  content: [],
                },
              ],
            },
            {
              type: 'paragraph',
              attrs: {
                textAlign: null,
                showIfKey: null,
              },
              content: [
                {
                  type: 'variable',
                  attrs: {
                    id: `steps.${digestStepBeforeCurrent.stepId}.eventCount | minus: ${maxIterations} | pluralize: 'more comment', ''`,
                    label: null,
                    fallback: null,
                    required: false,
                    aliasFor: null,
                  },
                },
              ],
            },
          ],
        })
        .run();
    },
  };
};
