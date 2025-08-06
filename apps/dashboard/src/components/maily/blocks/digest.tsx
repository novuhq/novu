import { BlockItem } from '@maily-to/core/blocks';
import { StepResponseDto } from '@novu/shared';
import { RiShadowLine } from 'react-icons/ri';
import { Badge } from '@/components/primitives/badge';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';

export const createDigestBlock = (props: {
  track: ReturnType<typeof useTelemetry>;
  digestStepBeforeCurrent: StepResponseDto;
}): BlockItem => {
  const { track, digestStepBeforeCurrent } = props;

  const maxIterations = 3;

  return {
    title: 'Digest',
    description: 'Display digested notifications in list.',
    searchTerms: ['digest', 'notification'],
    icon: <RiShadowLine className="h-4 w-4" />,
    preview: '/images/email-editor/digest-block-preview.webp',
    render: () => {
      return (
        <>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center">
            <RiShadowLine className="h-4 w-4" />
          </div>
          <div className="grow">
            <p className="flex items-center gap-1 font-medium">
              Digest
              <Badge color="orange" size="sm" variant="lighter">
                New
              </Badge>
            </p>
            <p className="text-xs text-gray-400">Display digested notifications in list.</p>
          </div>
        </>
      );
    },
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
                  content: [
                    {
                      type: 'variable',
                      attrs: {
                        id: 'current.payload.userName',
                        label: null,
                        fallback: null,
                        required: false,
                        aliasFor: 'steps.digest-step.events.payload.userName',
                      },
                    },
                    { type: 'text', text: ' commented: ' },
                    {
                      type: 'variable',
                      attrs: {
                        id: 'current.payload.comment',
                        label: null,
                        fallback: null,
                        required: false,
                        aliasFor: 'steps.digest-step.events.payload.comment',
                      },
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: null,
                    showIfKey: null,
                  },
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
