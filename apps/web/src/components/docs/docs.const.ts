import { ROUTES } from '../../constants/routes';

export const PATHS: { [key in ROUTES]?: string } = {
  [ROUTES.ACTIVITIES]: 'activity-feed/introduction',
  [ROUTES.LAYOUT]: 'content-creation-design/layouts',
  [ROUTES.CHANGES]: 'platform/environments',
  [ROUTES.INTEGRATIONS]: 'channels-and-providers/integration-store',
  [ROUTES.SUBSCRIBERS]: 'subscribers/subscribers',
  [ROUTES.WORKFLOWS]: 'workflows/notification-workflows',
  [ROUTES.TENANTS]: 'tenants/introduction',
  [ROUTES.TRANSLATIONS]: 'content-creation-design/translations',
  [ROUTES.STUDIO_ONBOARDING]: 'framework/quickstart',
  [ROUTES.STUDIO_ONBOARDING_PREVIEW]: 'framework/concepts/workflows',
  [ROUTES.STUDIO_FLOWS]: 'framework/concepts/workflows',
  [ROUTES.STUDIO_FLOWS_VIEW]: 'framework/concepts/workflows',
  [ROUTES.STUDIO_FLOWS_STEP_EDITOR]: 'framework/concepts/workflows',
  [ROUTES.STUDIO_FLOWS_TEST]: 'framework/concepts/workflows',
};

export const DOCS_URL = 'https://docs.novu.co';

export const MINTLIFY_IMAGE_URL = 'https://mintlify.s3-us-west-1.amazonaws.com/novu';

export const MDX_URL = 'https://cloud-doc.vercel.app/';
