import { SignUpOriginEnum } from '@novu/shared';

import { API_ROOT } from '../../../config';

export const buildGithubLink = ({
  invitationToken,
  isLoginPage,
}: {
  invitationToken?: string;
  isLoginPage?: boolean;
}) => {
  const queryParams = new URLSearchParams();
  queryParams.append('source', SignUpOriginEnum.WEB);
  if (invitationToken) {
    queryParams.append('invitationToken', invitationToken);
  }
  if (isLoginPage) {
    queryParams.append('isLoginPage', 'true');
  }

  return `${API_ROOT}/v1/auth/github?${queryParams.toString()}`;
};
