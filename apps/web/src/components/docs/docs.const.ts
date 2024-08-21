export const PATHS: Record<string, string> = {
  INTEGRATION_INTRODUCTION: 'integrations/providers/introduction',
  QUICK_START_NEXTJS: 'quickstart/nextjs',
  WORKFLOW_INTRODUCTION: 'workflow/introduction',
  CONCEPT_CONTROLS: 'concepts/controls',
  CONCEPT_ENDPOINT: 'concepts/endpoint',
  CONCEPT_WORKFLOWS: 'concepts/workflows',
  CONCEPT_TENANTS: 'concepts/tenants',
  CONCEPT_SUBSCRIBERS: 'concepts/subscribers',
} as const;

export type DocsPathsEnum = (typeof PATHS)[keyof typeof PATHS];

export const DOCS_URL = 'https://docs.novu.co';

export const MINTLIFY_IMAGE_URL = 'https://mintlify.s3-us-west-1.amazonaws.com/novu';

export const MDX_URL = 'https://cloud-doc.vercel.app/';
