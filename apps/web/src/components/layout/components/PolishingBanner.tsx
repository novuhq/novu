import { useMantineTheme } from '@mantine/core';
import { useSegment } from '../../providers/SegmentProvider';
import { Close } from '@novu/design-system';
import styled from '@emotion/styled';
import { useLocalStorage } from '@mantine/hooks';

export function PolishingBanner() {
  const isDark = useMantineTheme().colorScheme === 'dark';
  const segment = useSegment();
  const [polishingBannerDismissed, setPolishingBannerDismissed] = useLocalStorage({
    key: 'polishingBannerDismissed',
    defaultValue: 'false',
  });
  const selfHosted = process.env.REACT_APP_DOCKER_HOSTED_ENV === 'true';

  if (selfHosted || polishingBannerDismissed === 'true') return null;

  function DismissIcon() {
    function dismissBanner() {
      segment.track('Polishing Banner Dismiss');
      setPolishingBannerDismissed('true');
    }

    return (
      <CloseWrapper onClick={dismissBanner}>
        <Close />
      </CloseWrapper>
    );
  }

  return (
    <div
      style={{
        marginBottom: 10,
        width: '100%',
        borderRadius: 7,
        minHeight: 50,
        backgroundColor: isDark ? '#1E1E26' : 'white',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      We are polishing! This release is dedicated to bug fixes, UI improvements and performance optimizations.{' '}
      <a
        href={'https://novu.co/polishing?utm_source=web&utm_medium=banner&utm_campaign=polishing'}
        onClick={() => {
          segment.track('Polishing Banner Clicked');
        }}
        target={'_blank'}
        rel="noreferrer"
        style={{ textDecoration: 'underline', display: 'inline-block', marginLeft: 5 }}
      >
        Learn More.
      </a>
      <DismissIcon />
    </div>
  );
}

const CloseWrapper = styled.a`
  float: right;
  position: absolute;
  right: 15px;
  font-size: 10px;
  padding: 5px;
  &:hover {
    cursor: pointer;
  }

  svg {
    width: 13px;
  }
`;
