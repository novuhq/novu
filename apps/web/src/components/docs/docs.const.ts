import { ROUTES } from '../../constants/routes';

export const PATHS: { [key in ROUTES]?: string } = {
  // [ROUTES.INTEGRATIONS]: 'integrations/providers/introduction',
  [ROUTES.SUBSCRIBERS]: 'concepts/subscribers',
  [ROUTES.WORKFLOWS]: 'concepts/workflows',
  [ROUTES.TENANTS]: 'concepts/tenants',
  [ROUTES.STUDIO_ONBOARDING]: 'quickstart/nextjs',
  [ROUTES.STUDIO_ONBOARDING_PREVIEW]: 'concepts/controls',
  [ROUTES.STUDIO_FLOWS]: 'workflow/introduction',
  [ROUTES.STUDIO_FLOWS_VIEW]: 'workflow/introduction',
};

export const DOCS_URL = 'https://docs.novu.co';

export const MINTLIFY_IMAGE_URL = 'https://mintlify.s3-us-west-1.amazonaws.com/novu';

export const MDX_URL = 'https://cloud-doc.vercel.app/';
