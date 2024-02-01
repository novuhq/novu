import { Center, createStyles, Group, Loader, Skeleton, Stack } from '@mantine/core';
import { colors, Text } from '@novu/design-system';
import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import Frame from 'react-frame-component';
import { FieldError, FieldErrorsImpl, Merge } from 'react-hook-form';
import { When } from '../../../components/utils/When';
import { IFormStep } from '../components/formTypes';
import { EmailIntegrationInfo } from './EmailIntegrationInfo';
import { Mobile } from './Mobile';
import { PreviewEditOverlay } from './PreviewEditOverlay';
import { PreviewUserIcon } from './PreviewUserIcon';

const useStyles = createStyles((theme, { error }: { error: boolean }) => ({
  header: {
    width: '100%',
    marginTop: '20px',
    paddingLeft: '15px',
    paddingRight: '15px',
  },
  subject: {
    marginBottom: '3px',
    fontWeight: 'bolder',
  },
  from: {
    color: theme.colorScheme === 'dark' ? colors.B60 : colors.B70,
    fontWeight: 'normal',
  },
  line: {
    height: '2px',
    width: '340px',
    marginLeft: '15px',
    marginRight: '15px',
    background: theme.colorScheme === 'dark' ? colors.B20 : colors.B85,
    marginTop: '19px',
  },
  frame: {
    border: '0px',
    width: '100%',
    height: '609px',
    borderRadius: '0 0 30px 30px',
  },
  fallbackFrame: {
    border: '0px',
    width: '100%',
    height: '609px',
    borderRadius: '0 0 30px 30px',
    padding: '15px',
    textAlign: 'center',
  },
  content: {
    position: 'relative',
    border: error ? `1px solid ${colors.error}` : 'none',
  },
}));

export const PreviewMobile = ({
  integration,
  subject,
  content,
  loading = false,
  error,
  showEditOverlay = false,
  setSelectedLocale,
}: {
  integration: any;
  subject?: string;
  content: string;
  loading?: boolean;
  error?: Merge<FieldError, FieldErrorsImpl<IFormStep>>;
  showEditOverlay?: boolean;
  setSelectedLocale: (locale: string) => void;
}) => {
  const { classes } = useStyles({ error: !!(error && error.template?.content && error.template?.content?.message) });

  const [isEditOverlayVisible, setIsEditOverlayVisible] = useState(false);

  const handleMouseEnter = () => {
    if (showEditOverlay) {
      setIsEditOverlayVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (showEditOverlay && isEditOverlayVisible) {
      setIsEditOverlayVisible(false);
    }
  };

  return (
    <>
      <Mobile>
        <div className={classes.header}>
          <Group
            sx={{
              height: '40px',
            }}
            spacing={0}
            position="apart"
          >
            <div>
              <Group
                sx={{
                  height: '40px',
                }}
                spacing={13}
              >
                <When truthy={loading}>
                  <Skeleton height={40} width={40} circle />
                  <Stack spacing={3}>
                    <Skeleton height={14} width={160} radius="xs" />
                    <Skeleton height={14} width={80} />
                  </Stack>
                </When>

                <When truthy={!loading}>
                  <PreviewUserIcon />
                  <div>
                    {error && error.template?.subject && error.template?.subject?.message ? (
                      <Text color={colors.error}>{error.template.subject.message}</Text>
                    ) : (
                      <>
                        <div data-test-id="preview-subject" className={classes.subject}>
                          {subject}
                        </div>
                        <Group spacing={13} position="apart">
                          <div data-test-id="preview-from" className={classes.from}>
                            <EmailIntegrationInfo integration={integration} field={'from'} />
                          </div>
                        </Group>
                      </>
                    )}
                  </div>
                </When>
              </Group>
            </div>
          </Group>
        </div>
        <div className={classes.line}></div>
        <div className={classes.content} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <When truthy={loading}>
            <Stack spacing={40} py={40} px={30} h="100%">
              <Group position="center" noWrap>
                <Skeleton height={40} width={80} radius="sm" />
              </Group>
              <Stack spacing={12}>
                <Group spacing={16} noWrap>
                  <Skeleton height={14} width={'70%'} radius="sm" />
                  <Skeleton height={14} width={'30%'} radius="sm" />
                </Group>
                <Group spacing={16} noWrap>
                  <Skeleton height={14} width={'30%'} radius="sm" />
                  <Skeleton height={14} width={'70%'} radius="sm" />
                </Group>
                <Group spacing={16} noWrap>
                  <Skeleton height={14} width={'72%'} radius="sm" />
                </Group>
              </Stack>

              <Group spacing={16} mt="auto" noWrap>
                <Skeleton height={14} width={'30%'} radius="sm" />
              </Group>
            </Stack>
          </When>
          <When truthy={!loading}>
            {isEditOverlayVisible && <PreviewEditOverlay />}
            <ErrorBoundary
              FallbackComponent={() => (
                <div data-test-id="preview-content" className={classes.fallbackFrame}>
                  Oops! We've recognized some glitch in this HTML. Please give it another look!
                </div>
              )}
              resetKeys={[content]}
            >
              <Frame data-test-id="preview-content" className={classes.frame} initialContent={content}>
                <></>
              </Frame>
            </ErrorBoundary>
            {error && error.template?.content && error.template?.content?.message && (
              <Text color={colors.error}>{error?.template?.content?.message}</Text>
            )}
          </When>
        </div>
      </Mobile>
    </>
  );
};
