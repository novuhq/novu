import { getPopularTemplateIds } from '@novu/shared';
import { env } from '../../../../config/env';

export const POPULAR_GROUPED_NAME = 'Popular';
export const POPULAR_TEMPLATES_ID_LIST = getPopularTemplateIds({ production: env.NODE_ENV === 'production' });
