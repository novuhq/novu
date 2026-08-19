import type { JsonSchema } from '../../../types/schema.types';

/**
 * Photon iMessage provider-override payload schema.
 *
 * @see https://docs.photon.codes
 */
const photonImessageOutputSchema = {
  type: 'object',
  properties: {
    text: {
      type: 'string',
      description: 'Overrides the step body text.',
    },
    effect: {
      type: 'string',
      description:
        'iMessage expressive effect: a friendly name (confetti, fireworks, balloons, heart, lasers, celebration, sparkles, spotlight, echo, slam, loud, gentle, invisible) or a raw com.apple.… effect id.',
    },
    attachments: {
      type: 'array',
      items: { type: 'string', format: 'uri' },
      description: 'Attachment URLs sent alongside the message.',
    },
    voice: {
      type: 'string',
      format: 'uri',
      description: 'Audio URL sent as a native iMessage voice note (waveform bubble).',
    },
    replyToLast: {
      type: 'boolean',
      description: 'Reply-thread this send to the previous message sent to this recipient.',
    },
    format: {
      type: 'string',
      enum: ['markdown', 'text'],
      description: 'Force native styled text (markdown) or plain text for the body.',
    },
  },
  additionalProperties: true,
} as const satisfies JsonSchema;

export const photonImessageProviderSchemas = {
  output: photonImessageOutputSchema,
};
