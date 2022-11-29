import { AcceptInvite } from './accept-invite/accept-invite.usecase';
import { GetInvite } from './get-invite/get-invite.usecase';
import { BulkInvite } from './bulk-invite/bulk-invite.usecase';
import { InviteMember } from './invite-member/invite-member.usecase';
import { ResendInvite } from './resend-invite/resend-invite.usecase';

export const USE_CASES = [AcceptInvite, GetInvite, BulkInvite, InviteMember, ResendInvite];
