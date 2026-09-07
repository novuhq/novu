import { MemberRoleEnum, PermissionsEnum } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useId, useState } from 'react';
import {
  RiAddCircleLine,
  RiArrowDownSLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiLoader4Line,
  RiUserAddLine,
} from 'react-icons/ri';
import { Avatar, AvatarFallback } from '@/components/primitives/avatar';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { authClient } from '../client';
import { useAuth, useOrganization, useUser } from '../index';

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
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

function MemberListItem({
  member,
  currentUserId,
  onRemove,
  isRemoving,
  canManageMembers,
}: {
  member: Member;
  currentUserId: string;
  onRemove: (memberId: string) => void;
  isRemoving: boolean;
  canManageMembers: boolean;
}) {
  const isCurrentUser = member.userId === currentUserId;
  const isOwner = member.role === MemberRoleEnum.OWNER;

  const getRoleLabel = (role: string) => {
    switch (role) {
      case MemberRoleEnum.OWNER:
        return 'Owner';
      case MemberRoleEnum.ADMIN:
        return 'Admin';
      case MemberRoleEnum.AUTHOR:
        return 'Author';
      case MemberRoleEnum.VIEWER:
        return 'Viewer';
      default:
        return role.replace('org:', '').charAt(0).toUpperCase() + role.replace('org:', '').slice(1);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case MemberRoleEnum.OWNER:
        return 'bg-primary-100 text-primary-700';
      case MemberRoleEnum.ADMIN:
        return 'bg-blue-100 text-blue-700';
      case MemberRoleEnum.AUTHOR:
        return 'bg-purple-100 text-purple-700';
      case MemberRoleEnum.VIEWER:
        return 'bg-neutral-100 text-foreground-700';
      default:
        return 'bg-neutral-100 text-foreground-700';
    }
  };

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
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getRoleBadgeStyle(member.role)}`}>
          {getRoleLabel(member.role)}
        </span>
        {!isOwner && canManageMembers && (
          <Button
            variant="secondary"
            mode="ghost"
            size="sm"
            onClick={() => onRemove(member.id)}
            disabled={isCurrentUser || isRemoving}
            className="h-8 w-8 p-0"
          >
            {isRemoving ? (
              <RiLoader4Line className="size-4 animate-spin" />
            ) : (
              <RiDeleteBinLine className="size-4 text-destructive" />
            )}
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
  const getRoleLabel = (role: string) => {
    switch (role) {
      case MemberRoleEnum.OWNER:
        return 'Owner';
      case MemberRoleEnum.ADMIN:
        return 'Admin';
      case MemberRoleEnum.AUTHOR:
        return 'Author';
      case MemberRoleEnum.VIEWER:
        return 'Viewer';
      default:
        return role.replace('org:', '').charAt(0).toUpperCase() + role.replace('org:', '').slice(1);
    }
  };
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

export function TeamMembers({ appearance }: { appearance?: any }) {
  const { organization } = useOrganization();
  const { user } = useUser();
  const { has } = useAuth();
  const canManageMembers = has({ permission: PermissionsEnum.ORG_SETTINGS_WRITE });
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
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

      setOrganizationData(data as any);
    } catch (e: any) {
      console.error('Failed to load organization:', e);
      showErrorToast(e.message || 'Failed to load organization data', 'Load Error');
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    loadOrganizationData();
  }, [loadOrganizationData]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !organization?.id) return;

    setIsInviting(true);
    try {
      const { data, error } = await authClient.organization.inviteMember({
        organizationId: organization.id,
        email: inviteEmail,
        role: inviteRole as any,
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
    } catch (e: any) {
      console.error('Failed to invite member:', e);
      showErrorToast(e.message || 'Failed to send invitation', 'Invitation Error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!organization?.id) return;

    const confirmed = window.confirm('Are you sure you want to remove this member from the organization?');
    if (!confirmed) return;

    setIsRemoving(true);
    try {
      const { error } = await authClient.organization.removeMember({
        organizationId: organization.id,
        memberIdOrEmail: memberId,
      });

      if (error) {
        throw new Error(error.message || 'Failed to remove member');
      }

      showSuccessToast('Member removed successfully', 'Member Removed');
      await loadOrganizationData();
    } catch (e: any) {
      console.error('Failed to remove member:', e);
      showErrorToast(e.message || 'Failed to remove member', 'Remove Error');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!organization?.id) return;

    setIsCancelling(true);
    try {
      const { error } = await authClient.organization.cancelInvitation({
        invitationId,
      });

      if (error) {
        throw new Error(error.message || 'Failed to cancel invitation');
      }

      showSuccessToast('Invitation cancelled', 'Invitation Cancelled');
      await loadOrganizationData();
    } catch (e: any) {
      console.error('Failed to cancel invitation:', e);
      showErrorToast(e.message || 'Failed to cancel invitation', 'Cancel Error');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RiLoader4Line className="size-6 animate-spin text-foreground-600" />
      </div>
    );
  }

  const members = organizationData?.members || [];
  const pendingInvitations = organizationData?.invitations?.filter((inv) => inv.status === 'pending') || [];

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
                    <SelectItem value={MemberRoleEnum.VIEWER}>Viewer</SelectItem>
                    <SelectItem value={MemberRoleEnum.AUTHOR}>Author</SelectItem>
                    <SelectItem value={MemberRoleEnum.ADMIN}>Admin</SelectItem>
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
                        isCancelling={isCancelling}
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
                currentUserId={user?.id || ''}
                onRemove={handleRemoveMember}
                isRemoving={isRemoving}
                canManageMembers={canManageMembers}
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
    </div>
  );
}
