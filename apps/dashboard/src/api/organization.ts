import type { UpdateExternalOrganizationDto, IEnvironment } from '@novu/shared';
import { post } from './api.client';

export function updateClerkOrgMetadata({
  data,
  environment,
}: {
  data: UpdateExternalOrganizationDto;
  environment: IEnvironment;
}) {
  return post('/clerk/organization', { environment, body: data });
}
