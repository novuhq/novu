import type { ClerkAppearanceTheme } from '@clerk/shared/types';
import { MemberRoleEnum, PermissionsEnum } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useId, useState } from 'react';
import {
  RiAddCircleLine,
  RiArrowDownSLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiLoader4Line,
  RiLogoutBoxRLine,
  RiUserAddLine,
} from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Avatar, AvatarFallback } from '@/components/primitives/avatar';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { ROUTES } from '@/utils/routes';
import { authClient } from '../client';
import { useAuth, useOrganization, useUser } from '../index';

const MANAGEABLE_ROLES = [MemberRoleEnum.ADMIN, MemberRoleEnum.AUTHOR, MemberRoleEnum.VIEWER];
const OWNER_MANAGEABLE_ROLES = [MemberRoleEnum.OWNER, ...MANAGEABLE_ROLES];

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRoleLabel(role: string): string {
  switch (role) {
    case MemberRoleEnum.OWNER:
      return 'Owner';
    case MemberRoleEnum.ADMIN:
      return 'Admin';
    case MemberRoleEnum.AUTHOR:
      return 'Author';
    case MemberRoleEnum.VIEWER:
      return 'Viewer';
    default: {
      const name = role.replace('org:', '');

      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }
}

function getRoleBadgeStyle(role: string): string {
  switch (role) {
    case MemberRoleEnum.OWNER:
      return 'bg-primary-100 text-primary-700';
    case MemberRoleEnum.ADMIN:
      return 'bg-blue-100 text-blue-700';
    case MemberRoleEnum.AUTHOR:
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-neutral-100 text-foreground-700';
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

type Member = {
  id: string;
  userId: string;
  role: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
};

type OrganizationData = {
  id: string;
  name: string;
  slug: string;
  members: Member[];
  invitations?: Invitation[];
};

type MemberPermissions = {
  canManageMembers: boolean;
  isCurrentUserOwner: boolean;
  ownerCount: number;
};

type PendingConfirmation =
  | { type: 'remove-member'; member: Member }
  | { type: 'change-own-role'; member: Member; role: MemberRoleEnum }
  | { type: 'leave-organization' };

/**
 * Mirrors Better Auth's server-side rules: only owners can assign the Owner role or edit another
 * owner, and the last owner cannot step down.
 */
function getEditableRoleOptions(member: Member, permissions: MemberPermissions): MemberRoleEnum[] {
  if (!permissions.canManageMembers) {
    return [];
  }

  const isMemberOwner = member.role === MemberRoleEnum.OWNER;

  if (isMemberOwner && (!permissions.isCurrentUserOwner || permissions.ownerCount <= 1)) {
    return [];
  }

  const options = permissions.isCurrentUserOwner ? OWNER_MANAGEABLE_ROLES : MANAGEABLE_ROLES;

  return options.includes(member.role as MemberRoleEnum) ? options : [];
}

function canRemoveMember(member: Member, currentUserId: string, permissions: MemberPermissions): boolean {
  if (!permissions.canManageMembers || member.userId === currentUserId) {
    return false;
  }

  if (member.role === MemberRoleEnum.OWNER) {
    return permissions.isCurrentUserOwner && permissions.ownerCount > 1;
  }

  return true;
}

function getConfirmationContent(confirmation: PendingConfirmation) {
  switch (confirmation.type) {
    case 'remove-member':
      return {
        title: 'Remove member',
        description: `${confirmation.member.user.name || confirmation.member.user.email} will lose access to this organization.`,
        confirmButtonText: 'Remove member',
      };
    case 'change-own-role':
      return {
        title: 'Change your role',
        description: `You are about to change your own role to ${getRoleLabel(confirmation.role)}. You may lose access to some settings, including this page.`,
        confirmButtonText: 'Change role',
      };
    case 'leave-organization':
      return {
        title: 'Leave organization',
        description: 'You will lose access to this organization. You will need a new invitation to rejoin.',
        confirmButtonText: 'Leave organization',
      };
    default: {
      const exhaustiveCheck: never = confirmation;

      return exhaustiveCheck;
    }
  }
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getRoleBadgeStyle(role)}`}>
      {getRoleLabel(role)}
    </span>
  );
}

function MemberRoleControl({
  member,
  roleOptions,
  isSoleOwner,
  isPending,
  onRoleChange,
}: {
  member: Member;
  roleOptions: MemberRoleEnum[];
  isSoleOwner: boolean;
  isPending: boolean;
  onRoleChange: (member: Member, role: MemberRoleEnum) => void;
}) {
  if (roleOptions.length > 0) {
    return (
      <div className="w-28">
        <Select
          value={member.role}
          onValueChange={(value) => onRoleChange(member, value as MemberRoleEnum)}
          disabled={isPending}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((role) => (
              <SelectItem key={role} value={role}>
                {getRoleLabel(role)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (isSoleOwner) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <RoleBadge role={member.role} />
          </span>
        </TooltipTrigger>
        <TooltipContent>Promote another member to Owner before changing your role.</TooltipContent>
      </Tooltip>
    );
  }

  return <RoleBadge role={member.role} />;
}

function MemberListItem({
  member,
  currentUserId,
  permissions,
  isPending,
  onRoleChange,
  onRemove,
}: {
  member: Member;
  currentUserId: string;
  permissions: MemberPermissions;
  isPending: boolean;
  onRoleChange: (member: Member, role: MemberRoleEnum) => void;
  onRemove: (member: Member) => void;
}) {
  const isCurrentUser = member.userId === currentUserId;
  const roleOptions = getEditableRoleOptions(member, permissions);
  const isSoleOwner = isCurrentUser && member.role === MemberRoleEnum.OWNER && permissions.ownerCount <= 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="flex items-center justify-between border-b border-neutral-100 py-3 last:border-b-0"
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          {member.user.image ? (
            <img src={member.user.image} alt={member.user.name} className="h-full w-full object-cover" />
          ) : (
            <AvatarFallback className="bg-neutral-100 text-foreground-700 text-sm font-medium">
              {getInitials(member.user.name)}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground-950">
            {member.user.name}
            {isCurrentUser && <span className="ml-1.5 text-foreground-600">(You)</span>}
          </span>
          <span className="text-xs text-foreground-600">{member.user.email}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isPending && <RiLoader4Line className="size-4 animate-spin text-foreground-600" />}
        <MemberRoleControl
          member={member}
          roleOptions={roleOptions}
          isSoleOwner={isSoleOwner}
          isPending={isPending}
          onRoleChange={onRoleChange}
        />
        {canRemoveMember(member, currentUserId, permissions) && (
          <Button
            variant="secondary"
            mode="ghost"
            size="sm"
            onClick={() => onRemove(member)}
            disabled={isPending}
            className="h-8 w-8 p-0"
          >
            <RiDeleteBinLine className="size-4 text-destructive" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function InvitationListItem({
  invitation,
  onCancel,
  isCancelling,
  canManageMembers,
}: {
  invitation: Invitation;
  onCancel: (invitationId: string) => void;
  isCancelling: boolean;
  canManageMembers: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="flex items-center justify-between border-b border-neutral-100 py-3 last:border-b-0"
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-neutral-100 text-foreground-700 text-sm font-medium">
            {getInitials(invitation.email)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground-950">{invitation.email}</span>
          <span className="text-xs text-foreground-600">Pending invitation</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-foreground-700">
          {getRoleLabel(invitation.role)}
        </span>
        {canManageMembers && (
          <Button
            variant="secondary"
            mode="ghost"
            size="sm"
            onClick={() => onCancel(invitation.id)}
            disabled={isCancelling}
            className="h-8 w-8 p-0"
          >
            {isCancelling ? (
              <RiLoader4Line className="size-4 animate-spin" />
            ) : (
              <RiCloseLine className="size-4 text-foreground-600" />
            )}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function LeaveOrganizationSection({ isSoleOwner, onLeave }: { isSoleOwner: boolean; onLeave: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-col">
        <h3 className="text-sm font-medium text-foreground-950">Leave organization</h3>
        <p className="mt-1 text-xs text-foreground-600">
          {isSoleOwner
            ? 'You are the only owner. Make another member an Owner first.'
            : 'Remove yourself from this organization.'}
        </p>
      </div>
      <Button
        variant="error"
        mode="outline"
        size="sm"
        leadingIcon={RiLogoutBoxRLine}
        onClick={onLeave}
        disabled={isSoleOwner}
      >
        Leave
      </Button>
    </div>
  );
}

export function TeamMembers(_props: { appearance?: ClerkAppearanceTheme }) {
  const { organization } = useOrganization();
  const { user } = useUser();
  const { has, refreshSession, refreshOrganization } = useAuth();
  const navigate = useNavigate();
  const canManageMembers = has({ permission: PermissionsEnum.ORG_SETTINGS_WRITE });
  const isCurrentUserOwner = has({ role: MemberRoleEnum.OWNER });
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [cancellingInvitationId, setCancellingInvitationId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [showPendingInvites, setShowPendingInvites] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(MemberRoleEnum.VIEWER);

  const inviteEmailId = useId();

  const loadOrganizationData = useCallback(async () => {
    if (!organization?.id) return;

    try {
      setIsLoading(true);
      const { data, error } = await authClient.organization.getFullOrganization({
        query: {
          organizationId: organization.id,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to load organization data');
      }

      setOrganizationData(data);
    } catch (e) {
      console.error('Failed to load organization:', e);
      showErrorToast(getErrorMessage(e, 'Failed to load organization data'), 'Load Error');
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    void loadOrganizationData();
  }, [loadOrganizationData]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !organization?.id) return;

    setIsInviting(true);
    try {
      const { data, error } = await authClient.organization.inviteMember({
        organizationId: organization.id,
        email: inviteEmail,
        role: inviteRole,
      });

      if (error) {
        throw new Error(error.message || 'Failed to send invitation');
      }

      if (data?.id) {
        const inviteLink = `${window.location.origin}/auth/invitation/accept?id=${data.id}`;
        await navigator.clipboard.writeText(inviteLink);
        showSuccessToast('Invitation link copied to clipboard', 'Invitation Sent');
      }

      setInviteEmail('');
      setInviteRole(MemberRoleEnum.VIEWER);
      await loadOrganizationData();
    } catch (e) {
      console.error('Failed to invite member:', e);
      showErrorToast(getErrorMessage(e, 'Failed to send invitation'), 'Invitation Error');
    } finally {
      setIsInviting(false);
    }
  };

  const updateMemberRole = async (member: Member, role: MemberRoleEnum) => {
    if (!organization?.id) return;

    setPendingMemberId(member.id);
    try {
      const { error } = await authClient.organization.updateMemberRole({
        organizationId: organization.id,
        memberId: member.id,
        role,
      });

      if (error) {
        throw new Error(error.message || 'Failed to update member role');
      }

      showSuccessToast(`Role changed to ${getRoleLabel(role)}`, 'Role Updated');

      if (member.userId === user?.id) {
        await refreshOrganization();
      }

      await loadOrganizationData();
    } catch (e) {
      console.error('Failed to update member role:', e);
      showErrorToast(getErrorMessage(e, 'Failed to update member role'), 'Update Error');
    } finally {
      setPendingMemberId(null);
    }
  };

  const handleRoleChange = (member: Member, role: MemberRoleEnum) => {
    if (role === member.role) return;

    if (member.userId === user?.id) {
      setPendingConfirmation({ type: 'change-own-role', member, role });

      return;
    }

    void updateMemberRole(member, role);
  };

  const removeMember = async (member: Member) => {
    if (!organization?.id) return;

    setPendingMemberId(member.id);
    try {
      const { error } = await authClient.organization.removeMember({
        organizationId: organization.id,
        memberIdOrEmail: member.id,
      });

      if (error) {
        throw new Error(error.message || 'Failed to remove member');
      }

      showSuccessToast('Member removed successfully', 'Member Removed');
      await loadOrganizationData();
    } catch (e) {
      console.error('Failed to remove member:', e);
      showErrorToast(getErrorMessage(e, 'Failed to remove member'), 'Remove Error');
    } finally {
      setPendingMemberId(null);
    }
  };

  const leaveOrganization = async () => {
    if (!organization?.id) return;

    try {
      const { error } = await authClient.organization.leave({
        organizationId: organization.id,
      });

      if (error) {
        throw new Error(error.message || 'Failed to leave organization');
      }

      showSuccessToast(`You left ${organization.name}`, 'Left Organization');
      await refreshSession();
      void navigate(ROUTES.SIGNUP_ORGANIZATION_LIST, { replace: true });
    } catch (e) {
      console.error('Failed to leave organization:', e);
      showErrorToast(getErrorMessage(e, 'Failed to leave organization'), 'Leave Error');
    }
  };

  const handleConfirm = async () => {
    if (!pendingConfirmation) return;

    setIsConfirming(true);
    try {
      switch (pendingConfirmation.type) {
        case 'remove-member':
          await removeMember(pendingConfirmation.member);
          break;
        case 'change-own-role':
          await updateMemberRole(pendingConfirmation.member, pendingConfirmation.role);
          break;
        case 'leave-organization':
          await leaveOrganization();
          break;
        default: {
          const exhaustiveCheck: never = pendingConfirmation;

          return exhaustiveCheck;
        }
      }
    } finally {
      setIsConfirming(false);
      setPendingConfirmation(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!organization?.id) return;

    setCancellingInvitationId(invitationId);
    try {
      const { error } = await authClient.organization.cancelInvitation({
        invitationId,
      });

      if (error) {
        throw new Error(error.message || 'Failed to cancel invitation');
      }

      showSuccessToast('Invitation cancelled', 'Invitation Cancelled');
      await loadOrganizationData();
    } catch (e) {
      console.error('Failed to cancel invitation:', e);
      showErrorToast(getErrorMessage(e, 'Failed to cancel invitation'), 'Cancel Error');
    } finally {
      setCancellingInvitationId(null);
    }
  };

  if (isLoading && !organizationData) {
    return (
      <div className="flex items-center justify-center py-12">
        <RiLoader4Line className="size-6 animate-spin text-foreground-600" />
      </div>
    );
  }

  const members = organizationData?.members || [];
  const pendingInvitations = organizationData?.invitations?.filter((inv) => inv.status === 'pending') || [];
  const currentUserId = user?.id || '';
  const permissions: MemberPermissions = {
    canManageMembers,
    isCurrentUserOwner,
    ownerCount: members.filter((member) => member.role === MemberRoleEnum.OWNER).length,
  };
  const isCurrentUserSoleOwner = isCurrentUserOwner && permissions.ownerCount <= 1;
  const inviteRoleOptions = isCurrentUserOwner ? OWNER_MANAGEABLE_ROLES : MANAGEABLE_ROLES;
  const confirmationContent = pendingConfirmation ? getConfirmationContent(pendingConfirmation) : null;

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-100 pb-4">
        <h2 className="text-lg font-semibold text-foreground-950">
          Members <span className="text-foreground-600">({members.length})</span>
        </h2>
        <p className="mt-1 text-sm text-foreground-600">Manage who has access to this organization</p>
      </div>

      {canManageMembers && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-2">
            <RiUserAddLine className="size-5 text-foreground-600" />
            <h3 className="text-sm font-medium text-foreground-950">Invite new member</h3>
          </div>

          <form onSubmit={handleInvite} className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor={inviteEmailId} className="sr-only">
                  Email address
                </label>
                <Input
                  id={inviteEmailId}
                  type="email"
                  value={inviteEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)}
                  placeholder="member@example.com"
                  required
                  disabled={isInviting}
                  className="h-10"
                />
              </div>
              <div className="w-32">
                <Select
                  value={inviteRole}
                  onValueChange={(value) => setInviteRole(value as MemberRoleEnum)}
                  disabled={isInviting}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {inviteRoleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {getRoleLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={isInviting || !inviteEmail.trim()}
                variant="primary"
                mode="gradient"
                className="h-10 px-4"
              >
                {isInviting ? (
                  <RiLoader4Line className="size-4 animate-spin" />
                ) : (
                  <>
                    <RiAddCircleLine className="size-4" />
                    <span className="ml-1.5">Invite</span>
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-foreground-600">
              An invitation link will be generated and copied to your clipboard
            </p>
          </form>
        </div>
      )}

      {pendingInvitations.length > 0 && canManageMembers && (
        <div className="rounded-lg border border-neutral-200 bg-white">
          <button
            onClick={() => setShowPendingInvites(!showPendingInvites)}
            className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-neutral-50"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-foreground-950">
                Pending Invitations <span className="text-foreground-600">({pendingInvitations.length})</span>
              </h3>
            </div>
            <RiArrowDownSLine
              className={`size-5 text-foreground-600 transition-transform ${showPendingInvites ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {showPendingInvites && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-neutral-100"
              >
                <div className="px-4">
                  <AnimatePresence>
                    {pendingInvitations.map((invitation) => (
                      <InvitationListItem
                        key={invitation.id}
                        invitation={invitation}
                        onCancel={handleCancelInvitation}
                        isCancelling={cancellingInvitationId === invitation.id}
                        canManageMembers={canManageMembers}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="p-4">
          <AnimatePresence>
            {members.map((member) => (
              <MemberListItem
                key={member.id}
                member={member}
                currentUserId={currentUserId}
                permissions={permissions}
                isPending={pendingMemberId === member.id}
                onRoleChange={handleRoleChange}
                onRemove={(memberToRemove) => setPendingConfirmation({ type: 'remove-member', member: memberToRemove })}
              />
            ))}
          </AnimatePresence>

          {members.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-foreground-600">No members found</p>
            </div>
          )}
        </div>
      </div>

      {members.length > 0 && (
        <LeaveOrganizationSection
          isSoleOwner={isCurrentUserSoleOwner}
          onLeave={() => setPendingConfirmation({ type: 'leave-organization' })}
        />
      )}

      {confirmationContent && (
        <ConfirmationModal
          open
          onOpenChange={(open) => {
            if (!open && !isConfirming) {
              setPendingConfirmation(null);
            }
          }}
          onConfirm={handleConfirm}
          title={confirmationContent.title}
          description={confirmationContent.description}
          confirmButtonText={confirmationContent.confirmButtonText}
          confirmButtonVariant="error"
          isLoading={isConfirming}
        />
      )}
    </div>
  );
}
