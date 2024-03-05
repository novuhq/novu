import { IUserEntity } from '@novu/shared';
import { ROUTES } from '@novu/shared-web';
import { parseUrl } from '../../../utils/routeUtils';

export const buildInviteHref = ({
  invitedMemberEmail,
  organizationName,
  currentUser,
  copyLink,
}: {
  invitedMemberEmail: string;
  organizationName?: string;
  currentUser?: IUserEntity;
  copyLink: string;
}) => {
  const mailTo = `mailto:${invitedMemberEmail}`;
  const subject = `You've been invited to ${organizationName}`;
  // eslint-disable-next-line max-len
  const body = `\nHi!\n\nYou have been invited to ${organizationName} by ${currentUser?.firstName} ${currentUser?.lastName}.\n\nClick on the link below to accept ${copyLink}.`;

  return `${mailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export const generateInviteLink = (memberToken: string) => {
  return `${window.location.origin.toString()}` + parseUrl(ROUTES.AUTH_INVITATION_TOKEN, { token: memberToken });
};
