import { useClipboard } from '@mantine/hooks';
import { StyledButton } from './MembersInvitePage.styles';

export function CopyInviteLink({ inviteEmailLink, copyLink }: { inviteEmailLink: string; copyLink: string }) {
  const clipboardInviteLink = useClipboard({ timeout: 1000 });

  const clipboardCopyInviteLink = () => {
    clipboardInviteLink.copy(copyLink);
  };

  return (
    <div>
      The invite link was successfully created. You can send it by clicking
      <a
        href={inviteEmailLink}
        style={{ color: '#0000FF', paddingLeft: '3px' }}
        rel="noopener noreferrer"
        target="_blank"
      >
        here
      </a>
      . Or copy it directly clicking
      <StyledButton onClick={clipboardCopyInviteLink}>here.</StyledButton>
    </div>
  );
}
