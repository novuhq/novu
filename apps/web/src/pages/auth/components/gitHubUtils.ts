import { SignUpOriginEnum } from '@novu/shared';

import { API_ROOT } from '../../../config';

export const buildGithubLink = ({ invitationToken }: { invitationToken?: string }) => {
  const queryParams = new URLSearchParams();
  queryParams.append('source', SignUpOriginEnum.WEB);
  if (invitationToken) {
    queryParams.append('invitationToken', invitationToken);
  }

  return `${API_ROOT}/v1/auth/github?${queryParams.toString()}`;
};

export const buildGoogleLink = ({ invitationToken }: { invitationToken?: string }) => {
  const queryParams = new URLSearchParams();
  queryParams.append('source', SignUpOriginEnum.WEB);
  if (invitationToken) {
    queryParams.append('invitationToken', invitationToken);
  }

  return `${API_ROOT}/v1/auth/google?${queryParams.toString()}`;
};

export const buildVercelGithubLink = ({
  code,
  next,
  configurationId,
}: {
  code: string | null;
  next: string | null;
  configurationId: string | null;
}) => {
  const queryParams = new URLSearchParams();
  queryParams.append('partnerCode', code ?? '');
  queryParams.append('next', next ?? '');
  queryParams.append('configurationId', configurationId ?? '');
  queryParams.append('source', SignUpOriginEnum.VERCEL);

  return `${API_ROOT}/v1/auth/github?${queryParams.toString()}`;
};
