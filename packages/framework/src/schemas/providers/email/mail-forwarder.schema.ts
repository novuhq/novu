import type { JsonSchema } from '../../../types/schema.types';

export const mailForwarderProviderSchemas = {
  output: {
    type: 'object',
    properties: {
      MAIL_FORWARDER_BUCKET: { type: 'string', title: 'GCS Bucket Name' },
      GCP_PROJECT_ID: { type: 'string', title: 'GCP Project ID' },
      GCP_SERVICE_ACCOUNT_KEY_PATH: { type: 'string', title: 'Service Account Key Path', nullable: true },
      SERVICE_ACCOUNT_IDENTITY: { type: 'string', title: 'Service Account Identity'},
      senderEmail: { type: 'string', title: 'Sender Email', nullable: true },
      senderName: { type: 'string', title: 'Sender Name', nullable: true },
      defaultFrom: { type: 'string', title: 'Default From Address', nullable: true },
    },
    required: ['MAIL_FORWARDER_BUCKET', 'GCP_PROJECT_ID', 'SERVICE_ACCOUNT_IDENTITY'],
    additionalProperties: true,
  } satisfies JsonSchema,
};
