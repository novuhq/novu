import { GetOrganization } from '../../organization/usecases/get-organization/get-organization.usecase';
import { GetSignedUrl } from './get-signed-url/get-signed-url.usecase';

export const USE_CASES = [GetSignedUrl, GetOrganization];
